document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const customFileLabel = uploadArea.querySelector('.custom-file-label');
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
            const removeButton = document.createElement('button'); // O "X" é criado aqui
            removeButton.classList.add('remove-single-file');
            removeButton.innerHTML = '&times;'; // Caractere 'X'
            removeButton.title = `Remover ${file.name}`;

            // Listener de clique para o botão 'X' de remoção individual
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // ESSENCIAL: Previne que o clique no 'X' suba para o label
                console.log(`Removendo arquivo no índice: ${index}, nome: ${file.name}`);
                removeFileByIndex(index); // Chama a função para remover o arquivo
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

    // Função que realmente remove o arquivo e atualiza o estado
    function removeFileByIndex(indexToRemove) {
        if (indexToRemove < 0 || indexToRemove >= selectedFilesDataTransfer.items.length) {
            console.warn("Tentativa de remover índice inválido:", indexToRemove);
            return;
        }

        // Cria um NOVO DataTransfer sem o arquivo do índice especificado
        const newSelectedFilesDataTransfer = new DataTransfer();
        Array.from(selectedFilesDataTransfer.files).forEach((file, index) => {
            if (index !== indexToRemove) {
                newSelectedFilesDataTransfer.items.add(file);
            }
        });

        selectedFilesDataTransfer = newSelectedFilesDataTransfer; // Substitui o DataTransfer original
        fileInput.files = selectedFilesDataTransfer.files; // Sincroniza com o input real
        console.log("Arquivo removido. Novo estado do input.files:", fileInput.files);
        updateFileList(); // Atualiza a lista visual
    }

    // Listener de clique diretamente no LABEL. Este é o ÚNICO a abrir o seletor.
    customFileLabel.addEventListener('click', (event) => {
        // ESSENCIAL: Garante que o clique na label só abra o seletor
        // se o alvo não for um botão de remoção.
        if (event.target.classList.contains('remove-single-file')) {
             console.log("Clique em botão de remoção. Não abrimos o seletor.");
             return;
        }
        fileInput.click(); // Abre o seletor de arquivos.
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