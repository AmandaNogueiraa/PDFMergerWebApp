# app.py
from flask import Flask, render_template, request, send_file, redirect, url_for, session, jsonify
import PyPDF2
import os
import io
import re
import zipfile
import uuid
import threading
import time # Importado para usar time.sleep()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' 

# !!! ATENÇÃO: SUBSTITUA ESTA CHAVE POR UMA CHAVE SECRETA REAL E COMPLEXA !!!
# Você pode gerar uma usando import os; os.urandom(24).hex() no terminal Python.
app.config['SECRET_KEY'] = 'SUA_CHAVE_SECRETA_REAL_AQUI_E_MUITO_LONGA_E_COMPLEXA' 

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Dicionário global para armazenar o progresso das tarefas
# Em um ambiente de produção real, isso seria um cache como Redis ou um banco de dados (ex: Celery com Redis/RabbitMQ)
task_progress = {}

# Função auxiliar para parsear string de intervalo de páginas (reutilizada)
def parse_page_ranges(page_range_str, total_pages, default_to_all=False):
    pages_to_process = []
    if not page_range_str and default_to_all:
        return list(range(total_pages))
    parts = page_range_str.split(',')
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start_str, end_str = part.split('-')
                start = int(start_str)
                end = int(end_str)
                if not (1 <= start <= end <= total_pages):
                    raise ValueError(f"Intervalo inválido: {part}. As páginas devem estar entre 1 e {total_pages}.")
                pages_to_process.extend(range(start - 1, end))
            except ValueError as e:
                raise ValueError(f"Formato de intervalo inválido: {part}. Use números inteiros. Erro: {e}")
        else:
            try:
                page_num = int(part)
                if not (1 <= page_num <= total_pages):
                    raise ValueError(f"Página inválida: {part}. As páginas devem estar entre 1 e {total_pages}.")
                pages_to_process.append(page_num - 1)
            except ValueError as e:
                raise ValueError(f"Formato de página inválido: {part}. Use um número inteiro. Erro: {e}")
    
    if not pages_to_process and not default_to_all:
        raise ValueError("Nenhuma página válida especificada.")
    return sorted(list(set(pages_to_process)))

# Função que executa a união de PDFs (agora em um thread separado)
def perform_pdf_merge(task_id, files_data, desired_filename):
    # Inicializa o progresso da tarefa
    task_progress[task_id] = {'status': 'processing', 'progress': 0, 'result': None, 'error': None}
    
    merger = PyPDF2.PdfMerger()
    pdf_streams = []

    try:
        total_files = len(files_data)
        
        # Simular o progresso do anexo de arquivos
        for i, file_data in enumerate(files_data):
            pdf_stream = io.BytesIO(file_data)
            merger.append(pdf_stream)
            pdf_streams.append(pdf_stream)
            
            # Calcula o progresso. Usa 90% para deixar 10% para a etapa final de escrita.
            # Garante que o progresso não vá além de 90% antes da escrita final.
            progress_percent = int(((i + 1) / total_files) * 90)
            if progress_percent > 90:
                progress_percent = 90
            task_progress[task_id]['progress'] = progress_percent
            print(f"Task {task_id}: Progress {progress_percent}% - file {i+1}/{total_files}")
            
            # Adiciona um pequeno atraso para que o frontend tenha tempo de fazer polling
            time.sleep(0.2) 
            
        # Simular o progresso da escrita do PDF final (os últimos 10%)
        # Esta parte é uma estimativa, já que PyPDF2.write() não tem progresso interno
        task_progress[task_id]['progress'] = 95
        time.sleep(0.5) # Atraso adicional antes da escrita final
        print(f"Task {task_id}: Progress 95% - writing output.")


        output_pdf_stream = io.BytesIO()
        merger.write(output_pdf_stream)
        output_pdf_stream.seek(0)

        # Finaliza o progresso
        task_progress[task_id]['progress'] = 100
        task_progress[task_id]['status'] = 'completed'
        task_progress[task_id]['result'] = output_pdf_stream.getvalue() # Armazena o PDF final em bytes
        task_progress[task_id]['filename'] = desired_filename
        print(f"Task {task_id}: Completed.")

    except Exception as e:
        task_progress[task_id]['status'] = 'failed'
        task_progress[task_id]['error'] = str(e)
        print(f"Task {task_id}: Failed with error: {e}")
    finally:
        merger.close()
        for ps in pdf_streams:
            ps.close()

# Rota principal para unir PDFs
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/unir', methods=['POST'])
def unir_pdfs():
    if 'pdfs[]' not in request.files:
        return jsonify({'mensagem': "Nenhum arquivo enviado!"}), 400

    files = request.files.getlist('pdfs[]')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'mensagem': "Nenhum arquivo PDF selecionado para unir."}), 400

    # Gera um ID único para esta tarefa
    task_id = str(uuid.uuid4())
    
    # Armazena os dados dos arquivos em memória (para passar para o thread)
    # Filter out empty or non-PDF files here to avoid issues
    files_data = [file.read() for file in files if file and file.filename.endswith('.pdf')]
    
    if not files_data: # If no valid PDF files were provided
        return jsonify({'mensagem': "Nenhum arquivo PDF válido foi selecionado."}), 400

    nome_arquivo_desejado = request.form.get('nome_arquivo')
    if nome_arquivo_desejado:
        nome_arquivo_desejado = re.sub(r'[\\/:*?"<>|]', '', nome_arquivo_desejado)
        if not nome_arquivo_desejado.lower().endswith('.pdf'):
            nome_arquivo_final = f"{nome_arquivo_desejado}.pdf"
        else:
            nome_arquivo_final = nome_arquivo_desejado
    else:
        nome_arquivo_final = "pdfs_unidos.pdf"

    # Inicia o processamento do PDF em um thread separado
    thread = threading.Thread(target=perform_pdf_merge, args=(task_id, files_data, nome_arquivo_final))
    thread.start()

    # Retorna o ID da tarefa para o frontend, que usará para verificar o progresso
    return jsonify({'task_id': task_id}), 202 # Retorna 202 Accepted

# NOVA ROTA: Verificar progresso da tarefa
@app.route('/status/<task_id>')
def task_status(task_id):
    task = task_progress.get(task_id)
    if task is None:
        return jsonify({'status': 'not_found', 'progress': 0}), 404
    
    # Se a tarefa falhou, remove-a após informar o erro
    if task['status'] == 'failed':
        error_message = task['error']
        # Não deleta imediatamente, deixa o frontend ter chance de pegar o erro
        # del task_progress[task_id] 
        return jsonify({'status': 'failed', 'progress': task['progress'], 'error': error_message})
    
    # Se a tarefa completou, informa para o frontend que pode iniciar o download
    if task['status'] == 'completed':
        return jsonify({'status': 'completed', 'progress': 100})
    
    return jsonify({'status': task['status'], 'progress': task['progress']})

# NOVA ROTA: Baixar o arquivo final (após o processamento estar completo)
@app.route('/download/<task_id>')
def download_file(task_id):
    task = task_progress.get(task_id)
    if task and task['status'] == 'completed' and task['result'] is not None:
        output_pdf_stream = io.BytesIO(task['result'])
        download_name = task['filename']
        
        # Remove a tarefa e seus dados após o download para liberar memória
        # Isso é crucial para evitar que o dicionário task_progress cresça indefinidamente
        del task_progress[task_id]
        
        return send_file(output_pdf_stream,
                         mimetype='application/pdf',
                         as_attachment=True,
                         download_name=download_name)
    else:
        return "Arquivo não encontrado ou processamento não concluído.", 404


# Rotas para Divisor de PDF (já existentes, sem barra de progresso)
@app.route('/dividir')
def dividir_pdf_page():
    return render_template('split.html')

@app.route('/dividir', methods=['POST'])
def dividir_pdf_post():
    if 'pdf_file' not in request.files:
        return render_template('split.html', mensagem="Nenhum arquivo enviado!")

    file = request.files['pdf_file']
    if file.filename == '':
        return render_template('split.html', mensagem="Nenhum arquivo PDF selecionado.")
    
    if not file or not file.filename.endswith('.pdf'):
        return render_template('split.html', mensagem="Por favor, selecione um arquivo PDF válido.")

    try:
        input_pdf_stream = io.BytesIO(file.read())
        pdf_reader = PyPDF2.PdfReader(input_pdf_stream)
        total_pages = len(pdf_reader.pages)
        
        split_option = request.form.get('split_option')
        base_filename = os.path.splitext(file.filename)[0]

        if split_option == 'all':
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                for i in range(total_pages):
                    pdf_writer = PyPDF2.PdfWriter()
                    pdf_writer.add_page(pdf_reader.pages[i])
                    
                    output_page_pdf_stream = io.BytesIO()
                    pdf_writer.write(output_page_pdf_stream)
                    output_page_pdf_stream.seek(0)
                    
                    zf.writestr(f"{base_filename}_pagina_{i+1}.pdf", output_page_pdf_stream.getvalue())
            
            zip_buffer.seek(0)
            return send_file(zip_buffer,
                             mimetype='application/zip',
                             as_attachment=True,
                             download_name=f"{base_filename}_paginas_separadas.zip")

        elif split_option == 'range':
            page_range_str = request.form.get('page_range')
            if not page_range_str:
                return render_template('split.html', mensagem="Por favor, insira o intervalo de páginas.")

            pages_to_extract = parse_page_ranges(page_range_str, total_pages)
            
            pdf_writer = PyPDF2.PdfWriter()
            for page_index in pages_to_extract:
                pdf_writer.add_page(pdf_reader.pages[page_index])
            
            output_range_pdf_stream = io.BytesIO()
            pdf_writer.write(output_range_pdf_stream)
            output_range_pdf_stream.seek(0)

            return send_file(output_range_pdf_stream,
                             mimetype='application/pdf',
                             as_attachment=True,
                             download_name=f"{base_filename}_extraido.pdf")
        else:
            return render_template('split.html', mensagem="Opção de divisão inválida.")

    except ValueError as ve:
        return render_template('split.html', mensagem=f"Erro no intervalo de páginas: {ve}")
    except PyPDF2.errors.PdfReadError:
        return render_template('split.html', mensagem="Não foi possível ler o arquivo PDF. Verifique se está válido ou não protegido.")
    except Exception as e:
        return render_template('split.html', mensagem=f"Ocorreu um erro ao dividir o PDF: {e}")
    finally:
        if 'input_pdf_stream' in locals() and input_pdf_stream:
            input_pdf_stream.close()


# --- Rotas e Funções para Misturar PDFs ---
@app.route('/mix_pdf')
def mix_pdf_page():
    return render_template('mix_pdf.html')

@app.route('/mix_pdf', methods=['POST'])
def mix_pdf_post():
    main_pdf_file = request.files.get('main_pdf_file')
    source_pdf_file = request.files.get('source_pdf_file')
    pages_to_extract_str = request.form.get('pages_to_extract')
    insert_at_page_str = request.form.get('insert_at_page')

    if not main_pdf_file or main_pdf_file.filename == '':
        return render_template('mix_pdf.html', mensagem="Por favor, selecione o PDF principal.")
    if not source_pdf_file or source_pdf_file.filename == '':
        return render_template('mix_pdf.html', mensagem="Por favor, selecione o PDF de origem.")
    if not pages_to_extract_str:
        return render_template('mix_pdf.html', mensagem="Por favor, especifique as páginas a extrair do PDF de origem.")
    if not insert_at_page_str:
        return render_template('mix_pdf.html', mensagem="Por favor, especifique a página de inserção no PDF principal.")

    try:
        # Lendo o PDF principal
        main_pdf_stream = io.BytesIO(main_pdf_file.read())
        main_pdf_reader = PyPDF2.PdfReader(main_pdf_stream)
        main_total_pages = len(main_pdf_reader.pages)

        # Lendo o PDF de origem
        source_pdf_stream = io.BytesIO(source_pdf_file.read())
        source_pdf_reader = PyPDF2.PdfReader(source_pdf_stream)
        source_total_pages = len(source_pdf_reader.pages)

        # Parseando páginas a extrair do PDF de origem
        pages_to_extract_indices = parse_page_ranges(pages_to_extract_str, source_total_pages)
        if not pages_to_extract_indices:
            return render_template('mix_pdf.html', mensagem="Nenhuma página válida especificada para extrair do PDF de origem.")

        # Determinando a página de inserção no PDF principal
        insert_at_page = int(insert_at_page_str)
        if not (1 <= insert_at_page <= main_total_pages + 1): # Pode inserir no final (+1)
            return render_template('mix_pdf.html', mensagem=f"Página de inserção inválida. Deve estar entre 1 e {main_total_pages + 1}.")
        
        insert_index = insert_at_page - 1 # Converter para índice base 0

        # Criando o novo PDF com as páginas misturadas
        pdf_writer = PyPDF2.PdfWriter()

        # Adicionar páginas do PDF principal antes do ponto de inserção
        for i in range(insert_index):
            if i < main_total_pages:
                pdf_writer.add_page(main_pdf_reader.pages[i])

        # Adicionar páginas do PDF de origem
        for page_index in pages_to_extract_indices:
            pdf_writer.add_page(source_pdf_reader.pages[page_index])

        # Adicionar páginas restantes do PDF principal
        for i in range(insert_index, main_total_pages):
            pdf_writer.add_page(main_pdf_reader.pages[i])
        
        output_mixed_pdf_stream = io.BytesIO()
        pdf_writer.write(output_mixed_pdf_stream)
        output_mixed_pdf_stream.seek(0)

        # Nomeando o arquivo de saída
        base_filename_main = os.path.splitext(main_pdf_file.filename)[0]
        base_filename_source = os.path.splitext(source_pdf_file.filename)[0]
        download_name = f"{base_filename_main}_mix_{base_filename_source}.pdf"

        return send_file(output_mixed_pdf_stream,
                         mimetype='application/pdf',
                         as_attachment=True,
                         download_name=download_name)

    except ValueError as ve:
        return render_template('mix_pdf.html', mensagem=f"Erro de formato: {ve}")
    except PyPDF2.errors.PdfReadError:
        return render_template('mix_pdf.html', mensagem="Não foi possível ler um dos arquivos PDF. Verifique se estão válidos ou não protegidos.")
    except Exception as e:
        return render_template('mix_pdf.html', mensagem=f"Ocorreu um erro ao misturar os PDFs: {e}")
    finally:
        if 'main_pdf_stream' in locals() and main_pdf_stream:
            main_pdf_stream.close()
        if 'source_pdf_stream' in locals() and source_pdf_stream:
            source_pdf_stream.close()

if __name__ == '__main__':
    app.run(debug=True)