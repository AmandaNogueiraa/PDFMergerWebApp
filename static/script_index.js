document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const customFileLabel = uploadArea.querySelector('.custom-file-label'); // Seleciona o label
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const selectedFilesList = document.getElementById('selectedFilesList');
    // REMOVIDO: const removeAllFilesButton = selectedFileState.querySelector('.remove-file-button'); // Botão "Limpar tudo" foi removido do HTML e JS

    let selectedFilesDataTransfer = new DataTransfer();

    function updateFileList() {
        selectedFilesList.innerHTML = ''; // Limpa a lista visual atual

        // Se não há arquivos, mostra o estado inicial
        if (selectedFilesDataTransfer.items.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = '';
            console.log("Lista de arquivos vazia. Input file resetado.");
            return;
        }

        // Se há arquivos, mostra o estado de arquivos selecionados
        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';

        Array.from(selectedFilesDataTransfer.files).forEach((file, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            // Botão 'X' de remoção individual removido completamente do JS
            // const removeButton = document.createElement('button');
            // removeButton.classList.add('remove-single-file');
            // removeButton.innerHTML = '&times;';
            // removeButton.title = `Remover ${file.name}`;
            // removeButton.addEventListener('click', (event) => { /* ... */ });
            // listItem.appendChild(removeButton);
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

    // Função removeFileByIndex não é mais necessária, pois não há botões de remoção
    // function removeFileByIndex(indexToRemove) { /* ... */ }

    customFileLabel.addEventListener('click', (event) => {
        // Nenhuma verificação de 'remove-single-file' ou 'removeAllFilesButton' é necessária aqui,
        // pois esses botões não são mais criados/esperados.
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

    // O botão "Limpar tudo" e seu listener foram removidos
    // removeAllFilesButton.addEventListener('click', ...);

    updateFileList(); // Inicializa a lista ao carregar a página
});