document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const selectedFilesList = document.getElementById('selectedFilesList');
    const removeAllFilesButton = selectedFileState.querySelector('.remove-file-button');

    let selectedFiles = new DataTransfer();

    function updateFileList() {
        selectedFilesList.innerHTML = '';
        if (selectedFiles.items.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            // Certifica que o input file está realmente vazio para evitar o comportamento indesejado
            fileInput.value = ''; 
            return;
        }

        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';

        Array.from(selectedFiles.files).forEach((file, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('button');
            removeButton.classList.add('remove-single-file');
            removeButton.innerHTML = '&times;';
            removeButton.title = `Remover ${file.name}`;
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // MUITO IMPORTANTE: Previne que o clique no 'X' suba
                removeFileByIndex(index);
            });
            listItem.appendChild(removeButton);
            selectedFilesList.appendChild(listItem);
        });
    }

    function addFiles(files) {
        Array.from(files).forEach(file => {
            const isDuplicate = Array.from(selectedFiles.files).some(existingFile =>
                existingFile.name === file.name && existingFile.size === file.size && existingFile.lastModified === file.lastModified
            );
            if (!isDuplicate && file.type === 'application/pdf') {
                selectedFiles.items.add(file);
            } else if (file.type !== 'application/pdf') {
                alert(`O arquivo "${file.name}" não é um PDF e será ignorado.`);
            }
        });
        fileInput.files = selectedFiles.files;
        updateFileList();
    }

    function removeFileByIndex(indexToRemove) {
        const newSelectedFiles = new DataTransfer();
        Array.from(selectedFiles.files).forEach((file, index) => {
            if (index !== indexToRemove) {
                newSelectedFiles.items.add(file);
            }
        });
        selectedFiles = newSelectedFiles;
        fileInput.files = selectedFiles.files; // Atualiza o input original
        updateFileList();
    }

    // O listener de clique deve ser na LABEL, não na div custom-file-upload inteira,
    // porque o input type="file" está associado ao label.
    // O input type="file" já tem o atributo 'id' que se liga ao 'for' do label.
    // Então, ao clicar no label, o input file já é acionado por padrão do HTML.
    // Não precisamos simular o click() no input file aqui.
    // O que precisamos é garantir que o clique nos botões internos não acione o label.
    
    // Removendo o listener de click na uploadArea
    // uploadArea.addEventListener('click', (event) => {
    //     if (event.target.classList.contains('remove-single-file') || event.target === removeAllFilesButton) {
    //         return;
    //     }
    //     fileInput.click();
    // });

    // O input[type="file"] já está dentro do label, e o label está usando 'for' no input.
    // Clicar no label já ativa o input. O problema era o click explícito no JS.

    // Atualizar o estado visual quando um arquivo é selecionado
    fileInput.addEventListener('change', (event) => {
        addFiles(event.target.files);
    });

    // Lógica de Drag and Drop (manter no uploadArea)
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
        event.stopPropagation(); // MUITO IMPORTANTE: Previne que o clique no botão suba para o label
        selectedFiles = new DataTransfer();
        fileInput.value = '';
        fileInput.files = selectedFiles.files;
        updateFileList();
    });

    // Inicializar a lista
    updateFileList();
});