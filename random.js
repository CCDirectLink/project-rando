class Random {
    static init(baseDir) {
        Random.seedrandom = require(process.cwd() + '/' + baseDir + 'node_modules/seedrandom/index.js');
    }
    static seed(seed) {
        Random.random = Random.seedrandom(seed);
    }
    static randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Random.random() * (max - min)) + min;
    }
    static randomMember(array) {
        // return array[0];
        return array[this.randomInt(0, array.length)];
    }
}
Random.random = Math.random;
export { Random };
