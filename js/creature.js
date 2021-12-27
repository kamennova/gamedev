class Creature {
    maxSpeed = 10;
    wanderSpeed = 5;
    alertRadius = 60;

    coord;
    wallRadius = 50;
    flockRadius = 20;
    view;
    type;
    game;

    velocity = new Pos(0, 0);
    target;
    alpha = 0.2;
    wanderAngle = 0.4;
    lastAte = Date.now();

    constructor(type, view, coord, game) {
        this.type = type;
        this.view = view;
        this.coord = coord;
        this.view.updateCoordinate(this.coord);
        this.game = game;

        if (type === CreatureTypes.Hare) {
            this.maxSpeed = 14;
        } else if (type === CreatureTypes.Wolf) {
            this.maxSpeed = 12;
            this.alertRadius = 40;
        } else if (type === CreatureTypes.Hunter) {
            this.maxSpeed = 10;
        }
    }

    die() {
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
        this.getVelocity();
        this.updateCoordinate(this.coord.add(this.velocity));
    }

    avoidCreatures(creaturesNear) {
        let near = creaturesNear.map(c => this.coord.sub(c.coord));

        const res = near.reduce((acc, val) => acc = acc.add(val)).mt(1 / creaturesNear.length);
        return res.cut(this.maxSpeed);
    }

    avoidCliff() {
        let avoidVectors = [];
        // console.log(this.coord, this.wallRadius)

        if (this.coord.x <= this.wallRadius) {
            avoidVectors.push(new Pos(1, 0));
        } else if (LAND.width - this.coord.x <= this.wallRadius) {
            avoidVectors.push(new Pos( -1, 0 ));
        }

        if (this.coord.y <= this.wallRadius) {
            avoidVectors.push(new Pos( 0, 1 ));
        } else if (LAND.height - this.coord.y <= this.wallRadius) {
            avoidVectors.push(new Pos( 0, -1 ));
        }

        if (avoidVectors.length === 0) {
            return new Pos(0, 0);
        }

        const sum = avoidVectors.reduce((a, b) => a = a.add(b));
        return sum;
    }

    wander() {
        const change = 0.2;
        const center = this.velocity.clone().cut(1).mt(16);
        const displacement = new Pos(0, -1).mt(5); // todo

        Creature.setAngle(displacement, this.wanderAngle);
        this.wanderAngle += Math.random() * change - change / 2;
        return center.add(displacement);
    }

    static setAngle(vector, value) {
        const len = vector.innerDist();
        vector.x = Math.cos(value) * len;
        vector.y = Math.sin(value) * len;
    }

    specificVelocity() {
        return new Pos(0, 0);
    }

    getVelocity() {
        const spec = this.specificVelocity();
        const walls = this.avoidCliff();
        const steering = spec.equals(new Pos(0, 0)) && walls.equals(new Pos(0, 0)) ? this.wander() : spec.add(walls);
        this.velocity = this.velocity.mt(1 - this.alpha).add(steering.mt(this.alpha));
    }

    seek(target) {
        const vec = target.sub(this.coord);
        const desired = vec.cut(this.maxSpeed);

        return desired.sub(this.velocity);
    }

    pursuit(c) {
        const T = 3;

        if (c.coord.sub(this.coord).innerDist() <= 3) {
            console.log("I killed", this.type);
            this.lastAte = Date.now();
            c.die();
            return new Pos(0, 0);
        }

        const coord = c.coord.add(c.velocity.mt(T));
        return this.seek(coord);
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
        let near = this.game.inRadius(this, this.flockRadius).filter(a => a.type === this.type);
        if (near.length === 0) return new Pos(0, 0);

        const s = this.avoidCreatures(near).mt(1.5);
        const al = this.align(near);
        const c = this.cohesion(near);

        return s.add(al).add(c);
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
