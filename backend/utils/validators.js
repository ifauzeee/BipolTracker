const validate = {
    busPlate: (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.length >= 1 && value.length <= 20;
    },
    whatsappNumber: (value) => {
        if (!value || typeof value !== 'string') return false;
        return /^[0-9]{10,15}$/.test(value);
    },
    message: (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.length >= 5 && value.length <= 1000;
    },
    username: (value) => {
        if (!value || typeof value !== 'string') return false;
        return /^[a-zA-Z0-9_ ]{3,30}$/.test(value);
    },
    password: (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.length >= 4 && value.length <= 100;
    },
    coordinate: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= -180 && num <= 180;
    },
    speed: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 500;
    },
    gasLevel: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && num <= 10000;
    }
};

module.exports = validate;
