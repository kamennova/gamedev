const CreatureTypes = {
    Wolf: 'Wolf',
    Hunter: 'Hunter',
    Deer: 'Deer',
    Hare: 'Hare'
};

const WOLF_RAD = 200;

class Land {
    width = 800;
    height = 400;
    elem = document.getElementById("land");
}

const LAND = new Land();

const sumVectors = (v1, v2) => [ v1[ 0 ] + v2[ 0 ], v1[ 1 ] + v2[ 1 ] ];
const subtractVectors = (v1, v2) => [ v1[ 0 ] - v2[ 0 ], v1[ 1 ] - v2[ 1 ] ];
const normalize = (v) => (Math.abs(v[ 0 ]) > Math.abs(v[ 1 ])) ?
    [ v[ 0 ] > 0 ? 1 : -1, v[ 1 ] / v[ 0 ] ] : [ v[ 0 ] / v[ 1 ], v[ 1 ] > 0 ? 1 : -1 ]; // todo
const mt = (vec, num) => [ vec[ 0 ] * num, vec[ 1 ] * num ];
const dv = (vec, num) => [ vec[ 0 ] / num, vec[ 1 ] / num ];
const distanceKoef = (c1, c2) => Math.pow(c1[ 0 ] - c2[ 0 ], 2) + Math.pow(c1[ 1 ] - c2[ 1 ], 2);
const distKoefCoords = (c1, c2) => {
    const a = subtractVectors(c1, c2);
    return Math.pow(a[ 0 ], 2) + Math.pow(a[ 1 ], 2);
};

const createElem = (id, className) => {
    const elem = document.createElement('div');
    elem.id = id;
    elem.classList.add("creature");
    elem.classList.add(className);
    return elem;
}

class Game {
    score = 0;

    randomCoord() {
        return [ Math.random() * 800, Math.random() * 400 ];
    }

    finish(isWinner) {
        console.log("Game over, ", isWinner ? "your score: " + this.score : "you lost");
    }

    spawn() {
        const haresNum = 0;
        const wolvesNum = 0;
        const deerNum = 3;

        for (let i = 0; i < haresNum; i++) {
            LAND.elem.appendChild(createElem("hare-" + i, 'hare'));
            this.creatures.push(new Hare(new MoverView("#hare-" + i), this.randomCoord()));
        }

        for (let i = 0; i < wolvesNum; i++) {
            LAND.elem.appendChild(createElem("wolf-" + i, 'wolf'));
            this.creatures.push(new Wolf(new MoverView("#wolf-" + i), this.randomCoord()));
        }

        for (let i = 0; i < deerNum; i++) {
            LAND.elem.appendChild(createElem("deer-" + i, 'deer'));
            this.creatures.push(new Deer(new MoverView("#deer-" + i), this.randomCoord()));
        }

        this.creatures.push(new Hunter(new MoverView(".hunter"), [ 100, 100 ]));
    }

    start() {
        this.spawn();
        this.creatures.forEach(c => c.type !== CreatureTypes.Hunter ? c.start() : undefined);
    }

    creatures = [];

    inRadius(self, radius) {
        return this.creatures.filter((cr) => {
            if (cr === self) return false;
            const coord = cr.coord;
            const c = self.coord;
            let xDiff = Math.abs(coord[ 0 ] - c[ 0 ]);
            if (xDiff > radius) return false;
            let yDiff = coord[ 1 ] - c[ 1 ];
            if (yDiff > radius) return false;
            return Math.sqrt(yDiff * yDiff + xDiff * xDiff) <= radius;
        });
    }

    findNearestOnVector(c, vector) {
        const left = vector[ 0 ] < 0;
        const top = vector[ 1 ] > 0;
        // console.log(left, top);
        const res = this.creatures.filter(({coord, type}) =>
            type !== CreatureTypes.Hunter &&
            (left ? coord[ 0 ] >= c[ 0 ] : coord[ 0 ] <= c[ 0 ]) &&
            (top ? coord[ 1 ] >= c[ 1 ] : coord[ 1 ] <= c[ 1 ]) &&
            Math.abs(vector[ 0 ] * (coord[ 1 ] - c[ 1 ]) / vector[ 1 ] + c[ 0 ] - coord[ 0 ]) <= 10
            // x1-x / y1 -y = vector x / vector y
            // x1 = vector x * y1 - y / vector y + x
        );

        if (res.length === 0) return null;

        return res.sort((a, b) => distanceKoef(a.coord, c) - distanceKoef(b.coord, c))[ 0 ];
    }

    remove(c) {
        this.creatures = this.creatures.filter(cr => cr !== c);
    }

}

const CANVAS = new Game();

class Creature {
    maxSpeed = 40;
    wanderSpeed = 10;
    speed = 10;
    velocity = 0;
    coord = [ 100, 100 ];
    wallRadius = 50;
    alertRadius = 50;
    view;
    type;
    timeout;
    target = null;

    constructor(type, view, coord) {
        this.type = type;
        this.view = view;
        this.coord = coord;
        this.view.updateCoordinate(this.coord);
    }

    start() {
        this.velocity = [ 0, 10 ];
        this.updateCoordinateRegular();
    }

    die() {
        clearTimeout(this.timeout);
        this.view.elem.remove();
        console.log("I died")
        CANVAS.remove(this);
    }

    updateCoordinate(newCoord) {
        if (newCoord[ 0 ] < 0 || newCoord[ 0 ] > LAND.width || newCoord[ 1 ] < 0 || newCoord[ 1 ] > LAND.height) {
            console.log("out");
            this.die();
            return false;
        }

        this.coord = newCoord;
        this.view.updateCoordinate(this.coord);
        return true;
    }

    updateCoordinateRegular() {
        // console.log("upd");
        if (!this.updateCoordinate([ this.coord[ 0 ] + this.velocity[ 0 ], this.coord[ 1 ] + this.velocity[ 1 ] ])) return;
        this.timeout = setTimeout(this.updateCoordinateRegular.bind(this), 100);

        this.velocity = this.getDesiredVelocity();
    }

    avoidCreatures(filterAvoid) {
        let creaturesNear = CANVAS.inRadius(this, this.alertRadius).filter(filterAvoid)
            .map(c => subtractVectors(this.coord, c.coord));

        if (creaturesNear.length === 0) {
            return this.velocity;
        }

        const res = dv(creaturesNear.reduce((acc, val) => sumVectors(acc, val)), creaturesNear.length);
        // console.log(creaturesNear, res);
        return mt(normalize(res), 5);
    }


    avoidCliff() {
        let avoidVectors = [];
        // console.log(this.coord, this.wallRadius)

        if (this.coord[ 0 ] <= this.wallRadius) {
            avoidVectors.push([ 1, 0 ]);
        } else if (LAND.width - this.coord[ 0 ] <= this.wallRadius) {
            avoidVectors.push([ -1, 0 ]);
        }

        if (this.coord[ 1 ] <= this.wallRadius) {
            avoidVectors.push([ 0, 1 ]);
        } else if (LAND.height - this.coord[ 1 ] <= this.wallRadius) {
            avoidVectors.push([ 0, -1 ]);
        }

        if (avoidVectors.length === 0) {
            return [ 0, 0 ];
        }

        const sum = avoidVectors.reduce((a, b) => [ a[ 0 ] + b[ 0 ], a[ 1 ] + b[ 1 ] ]);
        return sum;
    }

    wander() {
        console.log("wander")
        this.speed = this.wanderSpeed;
        if (this.target != null) {

        } else {
            const angle = Math.random() * 3;
            const rad = Math.random() * 5;
            const y = Math.sin(angle) * rad;
            const x = Math.cos(angle) * rad;
            // this.target = [this.coord[0] + x, this.coord[1] + y];
            // console.log(this.coord, this.target, rad, angle);
            return [ x, y ];
        }
        return this.velocity;
    }

    group() {
        const inR = CANVAS.inRadius(this, WOLF_RAD).filter(a => a.type === this.type);

        if (inR.length === 0) return this.velocity; // todo

        // console.log(this.coord, this.chasingPrey.coord, subtractVectors(this.coord, prey.coord));
        const space = normalize(dv(inR.reduce((acc, val) => sumVectors(acc, val)), inR.length));
        const res = mt(normalize(subtractVectors(this.coord, inR[ 0 ].coord)), -1);
        console.log("group", res);
        return sumVectors(space, res);
    }

    chase(filterPrey) {
        const inR = CANVAS.inRadius(this, WOLF_RAD).filter(filterPrey);

        if (inR.length === 0) return this.velocity; // todo
        this.chasingPrey = inR[ 0 ];
        let prey = inR[ 0 ];


        if (distKoefCoords(prey.coord, this.coord) <= 8) {
            console.log("I killed", this.type);
            prey.die();
            return this.velocity;
        }

        // console.log(this.coord, this.chasingPrey.coord, subtractVectors(this.coord, prey.coord));

        return mt(normalize(subtractVectors(this.coord, this.chasingPrey.coord)), -5);
    }

    specificVelocity() {
        return [ 0, 0 ];
    }

    getDesiredVelocity() {
        const avoidVec = this.avoidCliff();
        const spec = this.specificVelocity();

        // console.log(avoidVec);
        const desiredVector = sumVectors(avoidVec, spec);

        if (desiredVector[ 0 ] === 0 && desiredVector[ 1 ] === 0) return this.wander();

        return desiredVector;
    }
}


class MoverView {
    constructor(query) {
        this.elem = document.querySelector(query);
    }

    elem;

    updateCoordinate(coord) {
        this.elem.style.left = coord[ 0 ] + "px";
        this.elem.style.bottom = coord[ 1 ] + "px";
    }
}

// -----

class Hunter extends Creature {
    speed = 10;
    bullets = 5;

    constructor(view, coord) {
        super(CreatureTypes.Hunter, view, coord);

        document.addEventListener('keydown', (e) => {

            const code = e.keyCode;
            console.log(e, code);

            switch (code) {
                case 37:
                    this.moveLeft();
                    break;
                case 38:
                    this.moveUp();
                    break;
                case 39:
                    this.moveRight();
                    break;
                case 40:
                    this.moveDown();
                    break;
                default:
                    break;
            }
        });

        LAND.elem.addEventListener('click', this.shoot.bind(this));
    }

    shoot(target) {
        const vector = normalize([ target.clientX - this.coord[ 0 ], 400 - target.clientY - this.coord[ 1 ] ]);
        const creature = CANVAS.findNearestOnVector(this.coord, vector);
        console.log('shoot', vector, target, [ target.clientX - this.coord[ 0 ], 400 - target.clientY - this.coord[ 1 ] ]);

        if (creature == null) {
            console.log("Missed");
        } else {
            creature.die();
            console.log("Hit");
        }

        this.bullets--;
        if (this.bullets === 0) {
            CANVAS.finish(CANVAS.score > 0);
        }
    }

    moveUp() {
        this.updateCoordinate([ this.coord[ 0 ], this.coord[ 1 ] + this.speed ]);
    }

    moveDown() {
        this.updateCoordinate([ this.coord[ 0 ], this.coord[ 1 ] - this.speed ]);
    }

    moveLeft() {
        this.updateCoordinate([ this.coord[ 0 ] - this.speed, this.coord[ 1 ] ]);
    }

    moveRight() {
        this.updateCoordinate([ this.coord[ 0 ] + this.speed, this.coord[ 1 ] ]);
    }

    die() {
        super.die();
        CANVAS.finish(false);
    }
}

class Wolf extends Creature {
    chasingPrey;

    constructor(view, coord) {
        super(CreatureTypes.Wolf, view, coord);
    }

    specificVelocity() {
        return this.chase(a => a.type !== CreatureTypes.Wolf);
    }
}

class Deer extends Creature {
    constructor(view, coord) {
        super(CreatureTypes.Deer, view, coord);
    }

    specificVelocity() {
        // return this.avoidCreatures(a => true)
        return dv(sumVectors(
            this.group(),
            this.avoidCreatures(a => a.type === CreatureTypes.Wolf)
        ), 2);
    }

}

class Hare extends Creature {
    constructor(view, coord) {
        super(CreatureTypes.Hare, view, coord);
    }

    specificVelocity() {
        return this.avoidCreatures((a) => true);
    }
}

// ----

CANVAS.start();
