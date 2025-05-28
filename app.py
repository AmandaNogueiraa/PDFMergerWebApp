# app.py
from flask import Flask, render_template, request, send_file
import PyPDF2
import os
import io
import re # Importar o módulo 're' para expressões regulares

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' 

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

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

        # --- NOVA LÓGICA PARA NOME DO ARQUIVO ---
        nome_arquivo_desejado = request.form.get('nome_arquivo') # Pega o nome do campo HTML

        if nome_arquivo_desejado:
            # Limpar o nome para evitar caracteres inválidos em sistemas de arquivos
            nome_arquivo_desejado = re.sub(r'[\\/:*?"<>|]', '', nome_arquivo_desejado)
            # Garantir que termina com .pdf
            if not nome_arquivo_desejado.lower().endswith('.pdf'):
                nome_arquivo_final = f"{nome_arquivo_desejado}.pdf"
            else:
                nome_arquivo_final = nome_arquivo_desejado
        else:
            nome_arquivo_final = "pdfs_unidos.pdf" # Nome padrão se nada for digitado
        # --- FIM NOVA LÓGICA ---

        return send_file(output_pdf_stream, 
                         mimetype='application/pdf',
                         as_attachment=True,
                         download_name=nome_arquivo_final) # Usa o nome final

    except Exception as e:
        return render_template('index.html', mensagem=f"Ocorreu um erro ao unir os PDFs: {e}")
    finally:
        merger.close()
        for ps in pdf_streams:
            ps.close()

if __name__ == '__main__':
    app.run(debug=True)