// Hook afterSign vacío para evitar errores de firma
exports.default = async function (context) {
    console.log('Skipping code signing...');
    return;
};
