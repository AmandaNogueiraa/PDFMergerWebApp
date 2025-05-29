document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const customFileLabel = uploadArea.querySelector('.custom-file-label');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const selectedFilesList = document.getElementById('selectedFilesList');
    const removeAllFilesButton = selectedFileState.querySelector('.remove-file-button');

    let selectedFilesDataTransfer = new DataTransfer();

    function updateFileList() {
        selectedFilesList.innerHTML = '';
        if (selectedFilesDataTransfer.items.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = '';
            console.log("Lista de arquivos vazia. Input file resetado.");
            return;
        }

        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';

        Array.from(selectedFilesDataTransfer.files).forEach((file, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('button');
            removeButton.classList.add('remove-single-file');
            removeButton.innerHTML = '&times;';
            removeButton.title = `Remover ${file.name}`;

            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // ESSENCIAL: Previne que o clique no 'X' suba
                console.log(`Removendo arquivo no índice: ${index}, nome: ${file.name}`);
                removeFileByIndex(index);
            });

            listItem.appendChild(removeButton);
            selectedFilesList.appendChild(listItem);
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

    function removeFileByIndex(indexToRemove) {
        if (indexToRemove < 0 || indexToRemove >= selectedFilesDataTransfer.items.length) {
            console.warn("Tentativa de remover índice inválido:", indexToRemove);
            return;
        }

        const newSelectedFilesDataTransfer = new DataTransfer();
        Array.from(selectedFilesDataTransfer.files).forEach((file, index) => {
            if (index !== indexToRemove) {
                newSelectedFilesDataTransfer.items.add(file);
            }
        });

        selectedFilesDataTransfer = newSelectedFilesDataTransfer;
        fileInput.files = selectedFilesDataTransfer.files;
        console.log("Arquivo removido. Novo estado do input.files:", fileInput.files);
        updateFileList();
    }

    // Listener de clique diretamente no LABEL. Este é o ÚNICO a abrir o seletor.
    customFileLabel.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-single-file') || event.target === removeAllFilesButton) {
             console.log("Clique em botão de remoção/limpeza. Não abrimos o seletor.");
             return;
        }
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

    // ***** ALTERAÇÃO AQUI: Adicionando setTimeout para o botão Limpar tudo *****
    removeAllFilesButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Essencial para parar a propagação imediata

        // Adiciona um pequeno atraso para que a propagação seja realmente parada
        // antes de tentar limpar e atualizar o DOM.
        setTimeout(() => {
            console.log("Botão 'Limpar tudo' clicado (após timeout).");
            selectedFilesDataTransfer = new DataTransfer();
            fileInput.value = '';
            fileInput.files = selectedFilesDataTransfer.files;
            updateFileList();
        }, 50); // Atraso de 50 milissegundos
    });

    updateFileList();
});