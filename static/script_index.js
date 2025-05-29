document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const selectedFilesList = document.getElementById('selectedFilesList');
    const removeAllFilesButton = selectedFileState.querySelector('.remove-file-button');

    // Inicializa DataTransfer. Será a "fonte da verdade" para os arquivos selecionados.
    let selectedFilesDataTransfer = new DataTransfer();

    function updateFileList() {
        selectedFilesList.innerHTML = ''; // Limpa a lista visual atual

        // Se não há arquivos, mostra o estado inicial
        if (selectedFilesDataTransfer.items.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = ''; // Garante que o input file do formulário esteja vazio
            console.log("Lista de arquivos vazia. Input file resetado.");
            return;
        }

        // Se há arquivos, mostra o estado de arquivos selecionados
        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';

        // Preenche a lista visual com os arquivos em selectedFilesDataTransfer
        Array.from(selectedFilesDataTransfer.files).forEach((file, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('button');
            removeButton.classList.add('remove-single-file');
            removeButton.innerHTML = '&times;'; // Caractere 'X'
            removeButton.title = `Remover ${file.name}`;

            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // MUITO IMPORTANTE: Previne que o clique no 'X' suba
                console.log(`Removendo arquivo no índice: ${index}, nome: ${file.name}`);
                removeFileByIndex(index);
            });

            listItem.appendChild(removeButton);
            selectedFilesList.appendChild(listItem);
        });

        console.log("Lista visual atualizada. Arquivos em DataTransfer:", selectedFilesDataTransfer.files);
    }

    // Adiciona arquivos ao DataTransfer e sincroniza
    function addFiles(filesToAdd) {
        let filesAdded = false;
        Array.from(filesToAdd).forEach(file => {
            // Verifica se o arquivo já existe no DataTransfer (para evitar duplicatas)
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

        if (filesAdded) { // Só atualiza se algo foi realmente adicionado
            fileInput.files = selectedFilesDataTransfer.files; // Sincroniza o input real com o DataTransfer
            updateFileList();
        }
    }

    // Remove um arquivo do DataTransfer pelo índice e sincroniza
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

    // ***** NOVO: Listener de clique na área de upload com verificação de alvo *****
    uploadArea.addEventListener('click', (event) => {
        // Verifica se o clique veio de um dos botões de remoção ou do botão "Limpar tudo"
        if (event.target.classList.contains('remove-single-file') || event.target === removeAllFilesButton) {
            console.log("Clique em botão de remoção/limpeza detectado. Ignorando abertura do seletor.");
            // Não fazemos nada aqui, o listener específico do botão já cuidou do stopPropagation
            // e da lógica de remoção/limpeza.
            return; 
        }

        // Se o clique não foi em um botão de remoção/limpeza, então aciona o seletor de arquivos.
        // O `label` pai já aciona o input por padrão do HTML, mas essa linha é uma garantia.
        fileInput.click(); 
        console.log("Área de upload clicada. Acionando seletor de arquivos.");
    });


    // Evento change para o input de arquivo (disparado ao selecionar via clique)
    fileInput.addEventListener('change', (event) => {
        console.log("Evento 'change' no input file disparado. Adicionando arquivos.");
        addFiles(event.target.files);
    });

    // Lógica de Drag and Drop (eventos na div custom-file-upload)
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

    // Botão "Limpar tudo"
    removeAllFilesButton.addEventListener('click', (event) => {
        event.stopPropagation(); // ESSENCIAL: Previne que o clique no botão suba para a área de upload
        console.log("Botão 'Limpar tudo' clicado.");
        selectedFilesDataTransfer = new DataTransfer(); // Reseta DataTransfer para uma lista vazia
        fileInput.value = ''; // Limpa o valor do input hidden
        fileInput.files = selectedFilesDataTransfer.files; // Garante que o input.files esteja vazio
        updateFileList(); // Atualiza a lista visual
    });

    // Inicializar o estado da lista quando a página carrega
    updateFileList();
});