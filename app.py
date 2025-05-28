# app.py
from flask import Flask, render_template, request, send_file
import PyPDF2
import os
import io

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' 

# Isso é bom para garantir que a pasta exista, mas não vamos salvar arquivos nela por segurança aqui.
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route('/')
def index():
    # Renderiza o template index.html
    return render_template('index.html')

@app.route('/unir', methods=['POST'])
def unir_pdfs():
    # Verifica se algum arquivo foi enviado
    if 'pdfs[]' not in request.files:
        return render_template('index.html', mensagem="Nenhum arquivo enviado!")

    # Obtém a lista de arquivos enviados
    files = request.files.getlist('pdfs[]')

    # Verifica se algum arquivo foi realmente selecionado (o campo pode estar vazio)
    if not files or all(f.filename == '' for f in files):
        return render_template('index.html', mensagem="Nenhum arquivo PDF selecionado para unir.")

    merger = PyPDF2.PdfMerger()
    pdf_streams = [] # Lista para manter as referências dos arquivos em memória

    try:
        for file in files:
            # Verifica se o arquivo existe e é um PDF
            if file and file.filename.endswith('.pdf'):
                # Lê o conteúdo do arquivo enviado diretamente para a memória
                pdf_stream = io.BytesIO(file.read())
                merger.append(pdf_stream)
                pdf_streams.append(pdf_stream) # Guarda o stream para fechar depois

        # Cria um novo stream de memória para o PDF de saída
        output_pdf_stream = io.BytesIO()
        merger.write(output_pdf_stream)
        output_pdf_stream.seek(0) # Volta para o início do stream para poder ser lido

        # Envia o PDF unido para o navegador do usuário
        return send_file(output_pdf_stream, 
                         mimetype='application/pdf',
                         as_attachment=True,
                         download_name='pdfs_unidos.pdf')

    except Exception as e:
        # Em caso de erro, exibe uma mensagem no HTML
        return render_template('index.html', mensagem=f"Ocorreu um erro ao unir os PDFs: {e}")
    finally:
        # Garante que o merger e todos os streams de PDF sejam fechados
        merger.close()
        for ps in pdf_streams:
            ps.close()

# Inicia o servidor Flask quando o script é executado
if __name__ == '__main__':
    app.run(debug=True) # debug=True para desenvolvimento (recarga automática e mensagens de erro)