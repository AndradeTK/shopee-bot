document.getElementById('add-group-btn').addEventListener('click', function() {
    const container = document.getElementById('target-groups-container');
    const newItem = document.createElement('div');
    newItem.classList.add('target-group-item');
    newItem.innerHTML = `
        <input type="text" name="targetGroups" placeholder="ID do novo grupo">
        <button type="button" class="remove-btn" onclick="removeGroup(this)">-</button>
    `;
    container.appendChild(newItem);
});

function removeGroup(button) {
    button.parentElement.remove();
}

function addGroup() {
    const container = document.getElementById('target-groups-container');
    const newItem = document.createElement('div');
    newItem.classList.add('input-group', 'mb-2');
    newItem.innerHTML = `
        <span class="input-group-text"><i class="fa-brands fa-whatsapp"></i></span>
        <input type="text" class="form-control" name="targetGroups" placeholder="ID do novo grupo de destino">
        <button class="btn btn-outline-danger" type="button" onclick="removeGroup(this)"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(newItem);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('ID do grupo copiado para a área de transferência!');
    }, (err) => {
        console.error('Erro ao copiar texto: ', err);
    });
}