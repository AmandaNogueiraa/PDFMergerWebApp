document.addEventListener('DOMContentLoaded', () => {
    function setupFileUpload(uploadAreaId, fileInputId) {
        const uploadArea = document.getElementById(uploadAreaId);
        const fileInput = document.getElementById(fileInputId);
        const customFileLabel = uploadArea.querySelector('.custom-file-label'); // Seleciona o label
        const initialState = uploadArea.querySelector('.initial-state');
        const selectedFileState = uploadArea.querySelector('.selected-file-state');
        const fileNameDisplay = selectedFileState.querySelector('.file-name');
        // const removeFileButton = selectedFileState.querySelector('.remove-file-button'); // Botão "Remover" individual removido

        function showInitialState() {
            initialState.style.display = 'flex';
            selectedFileState.style.display = 'none';
            fileInput.value = '';
            uploadArea.classList.remove('has-file');
        }

        function showSelectedFileState(fileName) {
            initialState.style.display = 'none';
            selectedFileState.style.display = 'flex';
            fileNameDisplay.textContent = fileName;
            uploadArea.classList.add('has-file');
        }

        customFileLabel.addEventListener('click', (event) => {
            // Nenhuma verificação de botão de remover é necessária, pois ele não existe mais.
            fileInput.click();
            console.log(`Label clicada em ${uploadAreaId}. Acionando seletor de arquivos.`);
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

        // removeFileButton.addEventListener('click', ...); // Event listener removido
        showInitialState();
    }

    setupFileUpload('mainPdfUpload', 'main_pdf_file');
    setupFileUpload('sourcePdfUpload', 'source_pdf_file');
});