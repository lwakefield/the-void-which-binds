function patch () {
    global.clamp = (a, min, max) => {
        if (a < min) return min;
        if (a > max) return max;
        return a;
    };
    global.capitalize = (str) => {
        return `${str[0].toUpperCase()}${str.slice(1)}`;
    };
}

module.exports.patch = patch;
