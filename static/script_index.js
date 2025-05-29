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
    let draggedItem = null; // Para o drag-and-drop

    // Função para atualizar a lista de arquivos na UI
    function updateFileList() {
        selectedFilesListMobile.innerHTML = '';
        selectedFilesListDesktop.innerHTML = '';

        const filesArray = Array.from(selectedFilesDataTransfer.files);

        if (filesArray.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = ''; // Limpa o input file real
            console.log("Lista de arquivos vazia. Input file resetado.");
            return;
        }

        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';

        filesArray.forEach((file, index) => {
            const createListItem = (listElement) => {
                const listItem = document.createElement('li');
                listItem.setAttribute('draggable', 'true'); // Torna o item arrastável
                listItem.dataset.index = index; // Armazena o índice atual do item

                listItem.innerHTML = `
                    <i class="fas fa-grip-vertical drag-handle" title="Arraste para reordenar"></i>
                    <span class="file-name-text">${file.name}</span>
                    <button type="button" class="remove-file-btn" title="Remover arquivo">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                // Event listener para o botão de remover
                listItem.querySelector('.remove-file-btn').addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que o clique se propague para o item da lista
                    removeFile(parseInt(listItem.dataset.index)); // Usa o dataset.index atual
                });

                // Lógica de Drag-and-Drop (para cada item da lista)
                listItem.addEventListener('dragstart', (e) => {
                    draggedItem = listItem;
                    e.dataTransfer.effectAllowed = 'move';
                    // Adiciona um pequeno atraso para a classe 'dragging' ser aplicada
                    setTimeout(() => {
                        listItem.classList.add('dragging');
                    }, 0);
                });

                listItem.addEventListener('dragenter', (e) => {
                    e.preventDefault();
                    if (draggedItem && draggedItem !== listItem) {
                        // Verifica a posição do mouse para decidir onde inserir
                        const bounding = listItem.getBoundingClientRect();
                        const offset = bounding.y + (bounding.height / 2);
                        if (e.clientY < offset) {
                            listItem.classList.remove('drag-over-bottom');
                            listItem.classList.add('drag-over-top');
                        } else {
                            listItem.classList.remove('drag-over-top');
                            listItem.classList.add('drag-over-bottom');
                        }
                    }
                });

                listItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });

                listItem.addEventListener('dragleave', () => {
                    listItem.classList.remove('drag-over-top', 'drag-over-bottom');
                });

                listItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    listItem.classList.remove('drag-over-top', 'drag-over-bottom');
                    if (draggedItem && draggedItem !== listItem) {
                        const draggedIndex = parseInt(draggedItem.dataset.index);
                        const targetIndex = parseInt(listItem.dataset.index);

                        // Decide se insere antes ou depois baseado na posição do mouse
                        const bounding = listItem.getBoundingClientRect();
                        const offset = bounding.y + (bounding.height / 2);
                        let newTargetIndex = targetIndex;
                        if (e.clientY > offset && draggedIndex < targetIndex) {
                            // Se arrastou para a metade inferior e o item arrastado já estava acima do alvo
                            // Mantém o targetIndex (insere depois do alvo)
                        } else if (e.clientY <= offset && draggedIndex > targetIndex) {
                             // Se arrastou para a metade superior e o item arrastado já estava abaixo do alvo
                            // Mantém o targetIndex (insere antes do alvo)
                        } else if (e.clientY > offset && draggedIndex > targetIndex) {
                            // Se arrastou para a metade inferior e o item arrastado já estava abaixo do alvo
                            newTargetIndex = targetIndex + 1; // Insere depois do alvo
                        }
                         // else if (e.clientY <= offset && draggedIndex < targetIndex) {
                         //    newTargetIndex = targetIndex; // Insere antes do alvo
                         // }


                        if (draggedIndex !== newTargetIndex) {
                            reorderFiles(draggedIndex, newTargetIndex);
                        }
                    }
                });

                listItem.addEventListener('dragend', () => {
                    draggedItem.classList.remove('dragging');
                    draggedItem = null;
                    document.querySelectorAll('.file-list li').forEach(item => {
                        item.classList.remove('drag-over-top', 'drag-over-bottom');
                    });
                });

                listElement.appendChild(listItem);
            };

            createListItem(selectedFilesListMobile); // Adiciona para a lista mobile
            createListItem(selectedFilesListDesktop); // Adiciona para a lista desktop
        });
    }

    // Função para adicionar arquivos, checando duplicatas e tipo
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
                showMessage(`O arquivo "${file.name}" não é um PDF e será ignorado.`, "danger");
            }
        });

        if (filesAdded) {
            fileInput.files = selectedFilesDataTransfer.files; // Atualiza o FileList do input real
            updateFileList(); // Renderiza a UI
        }
    }

    // Função para remover um arquivo pelo índice
    function removeFile(indexToRemove) {
        const currentFiles = Array.from(selectedFilesDataTransfer.files);
        const newFiles = new DataTransfer();
        currentFiles.forEach((file, index) => {
            if (index !== indexToRemove) {
                newFiles.items.add(file);
            }
        });
        selectedFilesDataTransfer = newFiles;
        fileInput.files = selectedFilesDataTransfer.files; // Atualiza o FileList do input real
        updateFileList(); // Renderiza a UI
        console.log(`Arquivo no índice ${indexToRemove} removido.`);
    }

    // Função para reordenar arquivos
    function reorderFiles(oldIndex, newIndex) {
        const filesArray = Array.from(selectedFilesDataTransfer.files);
        const [movedItem] = filesArray.splice(oldIndex, 1);
        
        // Ajusta newIndex se o item estiver sendo movido para uma posição anterior
        // e já tiver passado por ela
        if (oldIndex < newIndex) {
            newIndex = newIndex -1;
        }

        filesArray.splice(newIndex, 0, movedItem);

        const newFilesDataTransfer = new DataTransfer();
        filesArray.forEach(file => newFilesDataTransfer.items.add(file));
        selectedFilesDataTransfer = newFilesDataTransfer;

        fileInput.files = selectedFilesDataTransfer.files; // Atualiza o FileList do input real
        updateFileList(); // Renderiza a UI
        console.log(`Arquivos reordenados de ${oldIndex} para ${newIndex}.`);
    }

    // Funções de mensagem e UI reset (mantidas como estão)
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
        // Não reseta os arquivos selecionados automaticamente aqui, 
        // a limpeza acontece após o download bem-sucedido.
    }

    // Event Listeners (mantidos como estão, mas agora chamando as novas funções)
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

    // Intercepta o envio do formulário (mantido como está, mas agora `fileInput.files` já está atualizado)
    mergeForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        hideMessage();

        if (selectedFilesDataTransfer.items.length === 0) {
            showMessage("Por favor, selecione pelo menos um arquivo PDF.", "danger");
            return;
        }

        mergeButton.disabled = true;
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.textContent = '0%';
        progressStatus.textContent = 'Enviando arquivos...';

        const formData = new FormData();
        // Os arquivos já estão no `fileInput.files` na ordem correta
        Array.from(fileInput.files).forEach(file => { 
            formData.append('pdfs[]', file);
        });
        const nomeArquivo = document.getElementById('nome_arquivo').value;
        if (nomeArquivo) {
            formData.append('nome_arquivo', nomeArquivo);
        }

        try {
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
                    
                    window.location.href = `/download/${taskId}`;
                    
                    // Limpa os arquivos selecionados e reseta a UI após o download
                    selectedFilesDataTransfer = new DataTransfer();
                    fileInput.files = selectedFilesDataTransfer.files; // Resetar input file
                    updateFileList();
                    resetUI();
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
            }, 2000);

        } catch (error) {
            console.error("Erro na operação:", error);
            showMessage(`Erro: ${error.message}`, "danger");
            resetUI();
        }
    });

    updateFileList(); // Inicializa a lista ao carregar a página
});