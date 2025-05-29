document.addEventListener('DOMContentLoaded', () => {
    // Lógica para os radios de divisão
    document.querySelectorAll('input[name="split_option"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const pageRangeInput = document.getElementById('page_range');
            if (this.value === 'range') {
                pageRangeInput.style.display = 'block';
                pageRangeInput.setAttribute('required', 'required');
            } else {
                pageRangeInput.style.display = 'none';
                pageRangeInput.removeAttribute('required');
            }
        });
    });

    // Lógica para o upload de arquivo único
    const uploadArea = document.getElementById('splitPdfUpload'); // A div custom-file-upload
    const fileInput = document.getElementById('pdf_file'); // O input type="file"
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const fileNameDisplay = selectedFileState.querySelector('.file-name');
    const removeFileButton = selectedFileState.querySelector('.remove-file-button');

    function showInitialState() {
        initialState.style.display = 'flex';
        selectedFileState.style.display = 'none';
        fileInput.value = ''; // Limpa o input file
        uploadArea.classList.remove('has-file');
    }

    function showSelectedFileState(fileName) {
        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';
        fileNameDisplay.textContent = fileName;
        uploadArea.classList.add('has-file');
    }

    // ***** NOVO: Listener de clique na área de upload com verificação de alvo *****
    uploadArea.addEventListener('click', (event) => {
        // Se o clique veio do botão de remover, não faça nada aqui
        if (event.target === removeFileButton) {
            console.log("Clique no botão de remover detectado em Split. Ignorando abertura do seletor.");
            return;
        }
        // Caso contrário, aciona o seletor de arquivos (o label já faz isso, mas é uma garantia)
        fileInput.click();
        console.log("Área de upload clicada em Split. Acionando seletor de arquivos.");
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            showSelectedFileState(file.name);
        } else {
            showInitialState();
        }
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
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                fileInput.files = files;
                showSelectedFileState(file.name);
            } else {
                alert("Por favor, solte um arquivo PDF.");
                showInitialState();
            }
        }
    }); 

    removeFileButton.addEventListener('click', (event) => {
        event.stopPropagation(); // ESSENCIAL: Previne que o clique no botão suba para a label
        console.log("Botão de remover clicado em Split. Resetando estado.");
        showInitialState();
    });

    showInitialState();
});