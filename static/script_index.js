document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const customFileLabel = uploadArea.querySelector('.custom-file-label');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const selectedFilesListMobile = document.getElementById('selectedFilesList');
    const selectedFilesListDesktop = document.getElementById('selectedFilesListDesktop');

    // Elementos da Barra de Progresso
    const mergeForm = document.getElementById('mergeForm');
    const mergeButton = document.getElementById('mergeButton');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const progressStatus = document.getElementById('progressStatus');
    const statusMessage = document.getElementById('statusMessage');

    let selectedFilesDataTransfer = new DataTransfer();
    let pollingInterval; // Variável para armazenar o ID do intervalo de polling

    function updateFileList() {
        selectedFilesListMobile.innerHTML = '';
        selectedFilesListDesktop.innerHTML = '';

        if (selectedFilesDataTransfer.items.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = '';
            console.log("Lista de arquivos vazia. Input file resetado.");
            return;
        }

        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';

        Array.from(selectedFilesDataTransfer.files).forEach((file) => {
            const listItemMobile = document.createElement('li');
            listItemMobile.textContent = file.name;
            selectedFilesListMobile.appendChild(listItemMobile);

            const listItemDesktop = document.createElement('li');
            listItemDesktop.textContent = file.name;
            selectedFilesListDesktop.appendChild(listItemDesktop);
        });

        console.log("Lista visual atualizada. Arquivos em DataTransfer:", selectedFilesDataTransfer.files);
    }

    function addFiles(filesToAdd) {
        let filesAdded = false;
        Array.from(filesToAdd).forEach(file => {
            const isDuplicate = Array.from(selectedFilesDataTransfer.files).some(existingFile =>
                existingFile.name === file.name && existingFile.size === file.size && existingFile.lastModified === file.lastModified
            );

            if (!isDuplicate && file.type === 'application/pdf') {
                selectedFilesDataTransfer.items.add(file);
                filesAdded = true;
                console.log("Arquivo adicionado ao DataTransfer:", file.name);
            } else if (file.type !== 'application/pdf') {
                alert(`O arquivo "${file.name}" não é um PDF e será ignorado.`);
            }
        });

        if (filesAdded) {
            fileInput.files = selectedFilesDataTransfer.files;
            updateFileList();
        }
    }

    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `alert mt-3 alert-${type}`; // Bootstrap class
        statusMessage.style.display = 'block';
    }

    function hideMessage() {
        statusMessage.style.display = 'none';
    }

    function resetUI() {
        progressBarContainer.style.display = 'none';
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.textContent = '0%';
        progressStatus.textContent = 'Processando...';
        mergeButton.disabled = false;
        hideMessage();
        // Não reseta os arquivos selecionados, o usuário pode querer tentar novamente
        // ou a página já atualiza ao fazer o download.
    }

    customFileLabel.addEventListener('click', (event) => {
        fileInput.click();
        console.log("Label clicada. Acionando seletor de arquivos.");
    });

    fileInput.addEventListener('change', (event) => {
        console.log("Evento 'change' no input file disparado. Adicionando arquivos.");
        addFiles(event.target.files);
    });

    uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('drag-over');
        console.log("Evento 'drop' disparado. Adicionando arquivos.");
        addFiles(event.dataTransfer.files);
    });

    // Intercepta o envio do formulário
    mergeForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o envio tradicional do formulário

        hideMessage(); // Esconde qualquer mensagem anterior

        // Validação básica se há arquivos selecionados
        if (selectedFilesDataTransfer.items.length === 0) {
            showMessage("Por favor, selecione pelo menos um arquivo PDF.", "danger");
            return;
        }

        mergeButton.disabled = true; // Desabilita o botão para evitar múltiplos envios
        progressBarContainer.style.display = 'block'; // Mostra a barra de progresso
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.textContent = '0%';
        progressStatus.textContent = 'Enviando arquivos...';

        const formData = new FormData();
        Array.from(selectedFilesDataTransfer.files).forEach(file => {
            formData.append('pdfs[]', file);
        });
        const nomeArquivo = document.getElementById('nome_arquivo').value;
        if (nomeArquivo) {
            formData.append('nome_arquivo', nomeArquivo);
        }

        try {
            // Envia os arquivos para o Flask via AJAX
            const uploadResponse = await fetch('/unir', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.mensagem || "Erro ao iniciar o upload.");
            }

            const data = await uploadResponse.json();
            const taskId = data.task_id;
            progressStatus.textContent = 'Processando PDF...';

            // Inicia o polling para verificar o status
            pollingInterval = setInterval(async () => {
                const statusResponse = await fetch(`/status/${taskId}`);
                const statusData = await statusResponse.json();

                progressBar.style.width = `${statusData.progress}%`;
                progressBar.setAttribute('aria-valuenow', statusData.progress);
                progressBar.textContent = `${statusData.progress}%`;
                progressStatus.textContent = `Processando: ${statusData.progress}%`;

                if (statusData.status === 'completed') {
                    clearInterval(pollingInterval);
                    progressStatus.textContent = 'Processamento concluído! Baixando arquivo...';
                    showMessage("PDFs unidos com sucesso!", "success");
                    
                    // Inicia o download do arquivo
                    window.location.href = `/download/${taskId}`;
                    
                    resetUI(); // Reseta a UI após o download
                    selectedFilesDataTransfer = new DataTransfer(); // Limpa os arquivos selecionados
                    updateFileList(); // Atualiza a lista visual
                } else if (statusData.status === 'failed') {
                    clearInterval(pollingInterval);
                    const errorMessage = statusData.error || "Ocorreu um erro no processamento.";
                    showMessage(`Erro: ${errorMessage}`, "danger");
                    resetUI();
                } else if (statusData.status === 'not_found') {
                    clearInterval(pollingInterval);
                    showMessage("Tarefa não encontrada ou expirou.", "danger");
                    resetUI();
                }
            }, 2000); // Poll a cada 2 segundos

        } catch (error) {
            console.error("Erro na operação:", error);
            showMessage(`Erro: ${error.message}`, "danger");
            resetUI();
        }
    });

    updateFileList(); // Inicializa a lista ao carregar a página
});