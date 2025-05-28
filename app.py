# app.py
from flask import Flask, render_template, request, send_file, redirect, url_for
import PyPDF2
import os
import io
import re
import zipfile

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' 

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Função auxiliar para parsear string de intervalo de páginas (reutilizada)
def parse_page_ranges(page_range_str, total_pages, default_to_all=False):
    pages_to_process = []
    if not page_range_str and default_to_all:
        return list(range(total_pages)) # Se vazio e default_to_all, retorna todas as páginas

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

    return sorted(list(set(pages_to_process))) # Retorna páginas únicas e ordenadas


# Rota principal para unir PDFs (já existente)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/unir', methods=['POST'])
def unir_pdfs():
    if 'pdfs[]' not in request.files:
        return render_template('index.html', mensagem="Nenhum arquivo enviado!")

    files = request.files.getlist('pdfs[]')
    if not files or all(f.filename == '' for f in files):
        return render_template('index.html', mensagem="Nenhum arquivo PDF selecionado para unir.")

    merger = PyPDF2.PdfMerger()
    pdf_streams = [] 

    try:
        for file in files:
            if file and file.filename.endswith('.pdf'):
                pdf_stream = io.BytesIO(file.read())
                merger.append(pdf_stream)
                pdf_streams.append(pdf_stream)

        output_pdf_stream = io.BytesIO()
        merger.write(output_pdf_stream)
        output_pdf_stream.seek(0)

        nome_arquivo_desejado = request.form.get('nome_arquivo')
        if nome_arquivo_desejado:
            nome_arquivo_desejado = re.sub(r'[\\/:*?"<>|]', '', nome_arquivo_desejado)
            if not nome_arquivo_desejado.lower().endswith('.pdf'):
                nome_arquivo_final = f"{nome_arquivo_desejado}.pdf"
            else:
                nome_arquivo_final = nome_arquivo_desejado
        else:
            nome_arquivo_final = "pdfs_unidos.pdf"

        return send_file(output_pdf_stream, 
                         mimetype='application/pdf',
                         as_attachment=True,
                         download_name=nome_arquivo_final)

    except Exception as e:
        return render_template('index.html', mensagem=f"Ocorreu um erro ao unir os PDFs: {e}")
    finally:
        merger.close()
        for ps in pdf_streams:
            ps.close()

# Rotas para Divisor de PDF (já existente)
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
    except Exception as e:
        return render_template('split.html', mensagem=f"Ocorreu um erro ao dividir o PDF: {e}")
    finally:
        if 'input_pdf_stream' in locals() and input_pdf_stream:
            input_pdf_stream.close()


# --- NOVAS ROTAS E FUNÇÕES PARA MISTURAR PDFs ---

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
            if i < main_total_pages: # Evita erro se insert_index > main_total_pages
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