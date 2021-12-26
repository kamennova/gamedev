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
};

class Game {
    score = 0;
    creatures = [];
    timeout;
    counter = 0;
    isOn = false;

    constructor(params) {
        this.spawn(params);
    }

    randomCoord() {
        return new Pos(Math.random() * 800, Math.random() * 400);
    }

    finish(isWinner) {
        console.log("Game over, ", isWinner ? "your score: " + this.score : "you lost");
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

class Creature {
    maxSpeed = 10;
    wanderSpeed = 10;

    coord = [ 100, 100 ];
    wallRadius = 50;
    flockRadius = 20;
    alertRadius = 50;
    view;
    type;
    timeout;
    lastAte = Date.now();
    game;

    direction; // in radians
    velocity = new Pos(0, 10);
    speed = 10;
    target;
    alpha = 0.2;
    wanderAngle = 0.4;

    constructor(type, view, coord, game) {
        this.type = type;
        this.view = view;
        this.coord = coord;
        this.view.updateCoordinate(this.coord);
        this.lastAte = Date.now();
        this.game = game;
    }

    die() {
        // clearTimeout(this.timeout);
        this.view.elem.remove();
        console.log("I died");
        this.game.remove(this);
    }

    updateCoordinate(newCoord) {
        if (newCoord.x < 0 || newCoord.x > LAND.width || newCoord.y < 0 || newCoord.y > LAND.height) {
            console.log("out");
            this.die();
            return false;
        }

        this.coord = newCoord;
        this.view.updateCoordinate(this.coord);
        return true;
    }

    updateCoordinateRegular() {
        // this.getDesiredVelocity();
        const force = this.wander();
        this.velocity = this.velocity.mt(1 - this.alpha).add(force.mt(this.alpha));
        this.updateCoordinate(this.coord.add(this.velocity));
    }

    avoidCreatures(creaturesNear) {
        let near = creaturesNear.map(c => subtractVectors(this.coord, c.coord))

        const res = dv(near.reduce((acc, val) => sumVectors(acc, val)), creaturesNear.length);
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
        const change = 0.2;
        const center = this.velocity.clone().cut(1).mt(16);
        const displacement = new Pos(0, -1).mt(5); // todo

        this.setAngle(displacement, this.wanderAngle);
        this.wanderAngle += Math.random() * change - change / 2;
        return center.add(displacement);
    }

    setAngle(vector, value) {
        const len = vector.innerDist();
        vector.x = Math.cos(value) * len;
        vector.y = Math.sin(value) * len;
    }

    group() {
        const inR = this.game.inRadius(this, WOLF_RAD).filter(a => a.type === this.type);

        if (inR.length === 0) return this.velocity; // todo

        // console.log(this.coord, this.chasingPrey.coord, subtractVectors(this.coord, prey.coord));
        const space = normalize(dv(inR.reduce((acc, val) => sumVectors(acc, val)), inR.length));
        const res = mt(normalize(subtractVectors(this.coord, inR[ 0 ].coord)), -1);
        console.log("group", res);
        return sumVectors(space, res);
    }

    chase(filterPrey) {
        const inR = this.game.inRadius(this, WOLF_RAD).filter(filterPrey);

        if (Date.now() - this.lastAte > 10000) {
            if (Date.now() - this.lastAte > 20000) {
                this.die();
                return this.velocity;
            }
        }

        if (inR.length === 0) return this.velocity; // todo
        this.chasingPrey = inR[ 0 ];
        let prey = inR[ 0 ];


        if (distKoefCoords(prey.coord, this.coord) <= 8) {
            console.log("I killed", this.type);
            this.lastAte = Date.now();
            prey.die();
            return this.velocity;
        }

        // console.log(this.coord, this.chasingPrey.coord, subtractVectors(this.coord, prey.coord));

        return mt(normalize(subtractVectors(this.coord, this.chasingPrey.coord)), -5);
    }

    specificVelocity() {
        return [ 0, 0 ];
    }

    toAngle(rad) {
        return (((rad * 180 / Math.PI) + 180) % 360) * Math.PI / 180;
    }

    seek(target) {
        const vec = this.target.sub(this.coord);

        this.direction = this.toAngle(Math.atan(vec.y / vec.x));
        this.speed = Math.min(vec.innerDist(), this.maxSpeed);
        const desired = vec.cut(this.maxSpeed);

        const steering = desired.sub(this.velocity);
        this.velocity = this.velocity.mt(1 - this.alpha).add(steering.mt(this.alpha));

        console.log(this.direction, this.speed, this.toAngle(this.direction));

        // const avoidVec = this.avoidCliff();
        // const spec = this.specificVelocity();

        // const desiredVector = sumVectors(avoidVec, spec);
        // if (desiredVector[ 0 ] === 0 && desiredVector[ 1 ] === 0) return this.wander();
        // return desiredVector;
    }

    pursuit(c) {
        const T = 3;
        const coord = c.coord.add(c.velocity.mt(T));
        this.seek(coord);
    }


    getTarget() {
        this.target = new Pos(100, 100);
        return this.target;
    }

    align(creaturesNear) {
        let near = creaturesNear.map(c => c.velocity)
            .reduce((acc, val) => acc.add(val))
            .mt(1 / creaturesNear.length);

        return near.cut(this.maxSpeed).sub(this.velocity).cut(this.maxSpeed);
    }

    cohesion(creaturesNear) {
        let near = creaturesNear.map(c => c.coord)
            .reduce((acc, val) => acc.add(val))
            .mt(1 / creaturesNear.length);

        return this.seek(near);
    }

    flock() {
        let near = this.game.inRadius(this, this.flockRadius);
        if (near.length === 0) return new Pos(0, 0);

        const s = this.avoidCreatures(near);
        const al = this.align(near);
        const c = this.cohesion(near);
    }
}


class MoverView {
    constructor(query) {
        this.elem = document.querySelector(query);
    }

    elem;

    updateCoordinate(coord) {
        this.elem.style.left = coord.x + "px";
        this.elem.style.bottom = coord.y + "px";
    }
}

// -----

class Hunter extends Creature {
    speed = 10;
    bullets = 5;
    sideMove = null;
    verticalMove = null;

    constructor(view, coord, game) {
        super(CreatureTypes.Hunter, view, coord, game);

        document.addEventListener('keydown', (e) => {
            const code = e.keyCode;

            switch (code) {
                case 37:
                    this.sideMove = -1;
                    break;
                case 38:
                    this.verticalMove = 1;
                    break;
                case 39:
                    this.sideMove = 1;
                    break;
                case 40:
                    this.verticalMove = -1;
                    break;
                default:
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            const code = e.keyCode;

            switch (code) {
                case 37:
                case 39:
                    this.sideMove = null;
                    break;
                case 38:
                case 40:
                    this.verticalMove = null;
                    break;
                default:
                    break;
            }
        });

        LAND.elem.addEventListener('click', this.shoot.bind(this));
    }

    shoot(target) {
        const vector = normalize([ target.clientX - this.coord[ 0 ], 400 - target.clientY - this.coord[ 1 ] ]);
        const creature = this.game.findNearestOnVector(this.coord, vector);
        console.log('shoot', vector, target, [ target.clientX - this.coord[ 0 ], 400 - target.clientY - this.coord[ 1 ] ]);

        if (creature == null) {
            console.log("Missed");
        } else {
            creature.die();
            console.log("Hit");
        }

        this.bullets--;
        if (this.bullets === 0) {
            this.game.finish(this.game.score > 0);
        }
    }

    updateCoordinateRegular() {
        this.updateCoordinate(this.coord.add(new Pos(
            this.sideMove !== null ? this.speed * this.sideMove : 0,
            this.verticalMove !== null ? this.speed * this.verticalMove : 0
        )));
    }

    die() {
        super.die();
        this.game.finish(false);
    }
}

class Wolf extends Creature {
    constructor(view, coord, game) {
        super(CreatureTypes.Wolf, view, coord, game);
    }

    specificVelocity() {
        return this.chase(a => a.type !== CreatureTypes.Wolf);
    }
}

class Deer extends Creature {
    constructor(view, coord, game) {
        super(CreatureTypes.Deer, view, coord, game);
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
    constructor(view, coord, game) {
        super(CreatureTypes.Hare, view, coord, game);
    }

    specificVelocity() {
        return this.avoidCreatures((a) => true);
    }
}

// ----

let game;

document.getElementById("ok").addEventListener("click", (e) => {
    e.preventDefault();

    const form = document.forms.params;
    const formData = new FormData(form);

    const params = {
        hares: Number(formData.get("hares")),
        deer: Number(formData.get("deer")) * 4,
        wolves: Number(formData.get("wolves"))
    };

    game = new Game(params);
    game.start();
});

document.getElementById("stop").addEventListener("click", (e) => {
    game.stop();
});
