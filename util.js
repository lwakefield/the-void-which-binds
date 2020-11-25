function sleep (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function cmpArr (arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }

    return true;
}

function clone (obj) {
    return JSON.parse(JSON.stringify(obj));
}

function last (arr) { return arr[arr.length - 1]; }

module.exports = {
    sleep,
    cmpArr,
    clone,
    last
}
