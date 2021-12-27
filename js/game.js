const CreatureTypes = {
    Wolf: 'Wolf',
    Hunter: 'Hunter',
    Deer: 'Deer',
    Hare: 'Hare'
};

class Land {
    width = 800;
    height = 400;
    elem = document.getElementById("land");

    constructor() {
        this.width = this.elem.offsetWidth;
        this.height = this.elem.offsetHeight;
    }
}

const LAND = new Land();
const ALERT = document.getElementById("alert");

class Pos {
    x;
    y;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    sub(pos2) {
        return new Pos(this.x - pos2.x, this.y - pos2.y);
    }

    add(pos2) {
        return new Pos(this.x + pos2.x, this.y + pos2.y);
    }

    innerDist() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    equals(pos2) {
        return pos2.x === this.x && pos2.y === this.y;
    }

    cut(vec) {
        const hp = this.innerDist();
        if (hp <= vec) return new Pos(this.x, this.y);

        const k = vec / hp;
        return new Pos(this.x * k, this.y * k);
    }

    mt(num) {
        return new Pos(this.x * num, this.y * num);
    }

    clone() {
        return new Pos(this.x, this.y);
    }
}

const createElem = (id, className) => {
    const elem = document.createElement('div');
    elem.id = id;
    elem.classList.add("creature");
    elem.classList.add(className);
    return elem;
};

class Game {
    score = 0;
    creatures = [];
    timeout;
    isOn = false;

    constructor(params) {
        this.spawn(params);
    }

    randomCoord() {
        return new Pos(Math.random() * 800, Math.random() * 400);
    }

    finish(isWinner) {
        this.stop();
        ALERT.innerText = "Game over, " + (isWinner ? "your score: " + this.score : "you lost");
    }

    spawn(params) {
        for (let i = 0; i < params.hares; i++) {
            LAND.elem.appendChild(createElem("hare-" + i, 'hare'));
            this.creatures.push(new Hare(new MoverView("#hare-" + i), this.randomCoord(), this));
        }

        for (let i = 0; i < params.wolves; i++) {
            LAND.elem.appendChild(createElem("wolf-" + i, 'wolf'));
            this.creatures.push(new Wolf(new MoverView("#wolf-" + i), this.randomCoord(), this));
        }

        for (let i = 0; i < params.deer; i++) {
            LAND.elem.appendChild(createElem("deer-" + i, 'deer'));
            this.creatures.push(new Deer(new MoverView("#deer-" + i), this.randomCoord(), this));
        }

        this.creatures.push(new Hunter(new MoverView(".hunter"), this.randomCoord(), this));
    }

    start() {
        this.isOn = true;
        this.updateRegular();
    }

    stop() {
        console.log("stopped");
        this.isOn = false;
        clearTimeout(this.timeout);
    }

    updateRegular() {
        if (!this.isOn) {
            return;
        }

        console.log("upd");

        this.creatures.forEach(c => c.updateCoordinateRegular());
        this.timeout = setTimeout(this.updateRegular.bind(this), 100);
    }

    inRadius(self, radius) {
        return this.creatures.filter((cr) => {
            if (cr === self) return false;

            const coord = cr.coord;
            const c = self.coord;
            let xDiff = Math.abs(coord.x - c.x);
            if (xDiff > radius) return false;
            let yDiff = coord.y - c.y;
            if (yDiff > radius) return false;

            return Math.sqrt(yDiff * yDiff + xDiff * xDiff) <= radius;
        });
    }

    findNearestOnVector(c, vector) {
        const left = vector.x < 0;
        const top = vector.y > 0;

        const res = this.creatures.filter(({coord, type}) => {
                return type !== CreatureTypes.Hunter &&
                    Math.abs(vector.x * (coord.y - c.y) / vector.y + c.x - coord.x) <= 15
            }
            // x1-x / y1 -y = vector x / vector y
            // x1 = vector x * y1 - y / vector y + x
        );

        if (res.length === 0) return null;

        return res.sort((a, b) => a.coord.sub(c).innerDist() - b.coord.sub(c).innerDist())[ 0 ];
    }

    remove(c) {
        this.creatures = this.creatures.filter(cr => cr !== c);
    }

}
