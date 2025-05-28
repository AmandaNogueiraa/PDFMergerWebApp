# app.py
from flask import Flask, render_template, request, send_file, redirect, url_for
import PyPDF2
import os
import io
import re
import zipfile # Novo: Para criar arquivos ZIP

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' 

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

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

# --- NOVAS ROTAS E FUNÇÕES PARA DIVIDIR PDF ---

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
        base_filename = os.path.splitext(file.filename)[0] # Nome original sem extensão

        # Opção: Dividir todas as páginas
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

        # Opção: Dividir por intervalo de páginas
        elif split_option == 'range':
            page_range_str = request.form.get('page_range')
            if not page_range_str:
                return render_template('split.html', mensagem="Por favor, insira o intervalo de páginas.")

            # Processar a string de intervalo (ex: "1-5, 7, 10-12")
            pages_to_extract = []
            parts = page_range_str.split(',')
            for part in parts:
                part = part.strip()
                if '-' in part:
                    start_str, end_str = part.split('-')
                    start = int(start_str)
                    end = int(end_str)
                    if 1 <= start <= end <= total_pages:
                        pages_to_extract.extend(range(start - 1, end))
                    else:
                        return render_template('split.html', mensagem=f"Intervalo inválido: {part}. As páginas devem estar entre 1 e {total_pages}.")
                else:
                    page_num = int(part)
                    if 1 <= page_num <= total_pages:
                        pages_to_extract.append(page_num - 1)
                    else:
                        return render_template('split.html', mensagem=f"Página inválida: {part}. As páginas devem estar entre 1 e {total_pages}.")

            if not pages_to_extract:
                return render_template('split.html', mensagem="Nenhuma página válida para extrair no intervalo fornecido.")

            # Garantir páginas únicas e ordenadas
            pages_to_extract = sorted(list(set(pages_to_extract)))

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

    except ValueError:
        return render_template('split.html', mensagem="Formato do intervalo de páginas inválido. Use '1-5, 7'.")
    except Exception as e:
        return render_template('split.html', mensagem=f"Ocorreu um erro ao dividir o PDF: {e}")
    finally:
        input_pdf_stream.close()
        # pdf_reader.close() # PyPDF2.PdfReader does not have a close method on older versions
        # pdf_writer.close() # PyPDF2.PdfWriter does not have a close method on older versions


# --- FIM DAS NOVAS ROTAS ---

if __name__ == '__main__':
    app.run(debug=True)