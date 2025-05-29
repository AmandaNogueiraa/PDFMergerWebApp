document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('joinPdfUpload');
    const fileInput = document.getElementById('pdf_files');
    const customFileLabel = uploadArea.querySelector('.custom-file-label');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');

    // As duas listas de arquivos: uma para visualização mobile (dentro do upload-label), outra para desktop (na coluna lateral)
    const selectedFilesListMobile = document.getElementById('selectedFilesList'); // A lista original dentro do label
    const selectedFilesListDesktop = document.getElementById('selectedFilesListDesktop'); // A nova lista na coluna lateral

    let selectedFilesDataTransfer = new DataTransfer();

    function updateFileList() {
        // Limpa ambas as listas visuais
        selectedFilesListMobile.innerHTML = '';
        selectedFilesListDesktop.innerHTML = '';

        // Se não há arquivos, mostra o estado inicial da área de upload
        if (selectedFilesDataTransfer.items.length === 0) {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = ''; // Reseta o input de arquivo
            console.log("Lista de arquivos vazia. Input file resetado.");
            return; // Sai da função
        }

        // Se há arquivos, mostra o estado de arquivos selecionados
        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex'; // Isso é para o selected-file-state dentro do custom-file-label (mobile)

        Array.from(selectedFilesDataTransfer.files).forEach((file) => {
            // Cria item para a lista Mobile
            const listItemMobile = document.createElement('li');
            listItemMobile.textContent = file.name;
            selectedFilesListMobile.appendChild(listItemMobile);

            // Cria item para a lista Desktop
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
            updateFileList(); // Atualiza a lista visual após adicionar arquivos
        }
    }

    customFileLabel.addEventListener('click', (event) => {
        // Aciona o clique no input de arquivo.
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

    // Chama updateFileList uma vez para configurar o estado inicial ao carregar a página
    updateFileList();
});