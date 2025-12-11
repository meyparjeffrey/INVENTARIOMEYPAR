// Hook afterSign vacío para evitar errores de firma
module.exports = async function (context) {
    console.log('Skipping code signing...');
    return;
};
