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

    // Lógica para o upload de arquivo (reutilizável para um único arquivo)
    const uploadArea = document.getElementById('splitPdfUpload');
    const fileInput = document.getElementById('pdf_file');
    const initialState = uploadArea.querySelector('.initial-state');
    const selectedFileState = uploadArea.querySelector('.selected-file-state');
    const fileNameDisplay = selectedFileState.querySelector('.file-name');
    const removeFileButton = selectedFileState.querySelector('.remove-file-button');

    function showInitialState() {
        initialState.style.display = 'flex'; // Use flex para alinhar o conteúdo
        selectedFileState.style.display = 'none';
        fileInput.value = ''; // Limpa o input file
        uploadArea.classList.remove('has-file'); // Adiciona/remove classe para controle visual
    }

    function showSelectedFileState(fileName) {
        initialState.style.display = 'none';
        selectedFileState.style.display = 'flex';
        fileNameDisplay.textContent = fileName;
        uploadArea.classList.add('has-file');
    }

    // Clicar na área de upload abre o seletor de arquivos
    uploadArea.addEventListener('click', (event) => {
        // Impede que o clique no botão de remover acione o clique na área
        if (event.target === removeFileButton) {
            return;
        }
        fileInput.click();
    });

    // Atualizar o estado visual quando um arquivo é selecionado
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            showSelectedFileState(file.name);
        } else {
            showInitialState();
        }
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
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                // Atribui o arquivo dropado ao input real
                fileInput.files = files;
                showSelectedFileState(file.name);
            } else {
                alert("Por favor, solte um arquivo PDF.");
                showInitialState();
            }
        }
    });

    // Botão de remover arquivo
    removeFileButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Previne que o clique suba para a área de upload
        showInitialState();
    });

    // Inicializar o estado
    showInitialState();
});