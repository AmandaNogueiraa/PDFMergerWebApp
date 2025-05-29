document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const selectedFilesList = document.getElementById('selectedFilesList');
    const removeAllFilesButton = selectedFileState.querySelector('.remove-file-button');

    // Armazenar os arquivos selecionados para manipulação
    let selectedFiles = new DataTransfer();

    function updateFileList() {
        selectedFilesList.innerHTML = ''; // Limpa a lista existente
        if (selectedFiles.items.length === 0) {
            initialState.style.display = 'flex'; // Mostra o estado inicial
            selectedFileState.style.display = 'none'; // Esconde o estado de arquivos selecionados
            return;
        }

        initialState.style.display = 'none'; // Esconde o estado inicial
        selectedFileState.style.display = 'flex'; // Mostra o estado de arquivos selecionados

        Array.from(selectedFiles.files).forEach((file, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('button');
            removeButton.classList.add('remove-single-file');
            removeButton.innerHTML = '&times;'; // Caractere 'X'
            removeButton.title = `Remover ${file.name}`;
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Previne clique no label
                removeFileByIndex(index);
            });
            listItem.appendChild(removeButton);
            selectedFilesList.appendChild(listItem);
        });
    }

    function addFiles(files) {
        Array.from(files).forEach(file => {
            // Verifica se o arquivo já foi adicionado para evitar duplicatas visuais
            const isDuplicate = Array.from(selectedFiles.files).some(existingFile =>
                existingFile.name === file.name && existingFile.size === file.size && existingFile.lastModified === file.lastModified
            );
            if (!isDuplicate && file.type === 'application/pdf') {
                selectedFiles.items.add(file);
            } else if (file.type !== 'application/pdf') {
                alert(`O arquivo "${file.name}" não é um PDF e será ignorado.`);
            }
        });
        fileInput.files = selectedFiles.files; // Atualiza o input original que será enviado
        updateFileList();
    }

    function removeFileByIndex(indexToRemove) {
        // Crie um novo DataTransfer para reconstruir a lista sem o arquivo removido
        const newSelectedFiles = new DataTransfer();
        Array.from(selectedFiles.files).forEach((file, index) => {
            if (index !== indexToRemove) {
                newSelectedFiles.items.add(file);
            }
        });
        selectedFiles = newSelectedFiles; // Substitui o DataTransfer original
        fileInput.files = selectedFiles.files; // Sincroniza com o input real
        updateFileList();
    }

    // Clicar na área de upload abre o seletor de arquivos
    uploadArea.addEventListener('click', (event) => {
        // Se clicou em um botão de remover, não abra o seletor
        if (event.target.classList.contains('remove-single-file') || event.target === removeAllFilesButton) {
            return;
        }
        fileInput.click();
    });

    // Quando arquivos são selecionados via input
    fileInput.addEventListener('change', (event) => {
        addFiles(event.target.files);
    });

    // Lógica de Drag and Drop
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
        addFiles(event.dataTransfer.files);
    });

    // Botão "Limpar tudo"
    removeAllFilesButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Previne que o clique suba para a área de upload
        selectedFiles = new DataTransfer(); // Reseta DataTransfer para uma lista vazia
        fileInput.value = ''; // Limpa o valor do input hidden (importante para o formulário)
        fileInput.files = selectedFiles.files; // Garante que o input.files esteja vazio
        updateFileList();
    });

    // Inicializar a lista
    updateFileList();
});