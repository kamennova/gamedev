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
        //  todo
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
    lastAte = Date.now();

    constructor(view, coord, game) {
        super(CreatureTypes.Wolf, view, coord, game);
    }

    specificVelocity() {
        if (Date.now() - this.lastAte > 10000) {
            if (Date.now() - this.lastAte > 20000) {
                this.die();
                return new Pos(0, 0);
            }
        }


        const inR = this.game.inRadius(this, this.alertRadius).filter(a => a.type === CreatureTypes.Deer || a.type === CreatureTypes.Hare);
        if (inR.length === 0) return new Pos(0, 0);

        return this.pursuit(inR[0]);
    }
}

class Deer extends Creature {
    constructor(view, coord, game) {
        super(CreatureTypes.Deer, view, coord, game);
    }

    specificVelocity() {
        let near = this.game.inRadius(this, this.alertRadius)
            .filter(a => a.type === CreatureTypes.Wolf || a.type === CreatureTypes.Hunter);
        if (near.length > 0) return this.flee(near);

        return this.flock()
    }

}

class Hare extends Creature {
    constructor(view, coord, game) {
        super(CreatureTypes.Hare, view, coord, game);
    }

    specificVelocity() {
        let near = this.game.inRadius(this, this.alertRadius);
        if (near.length === 0) return new Pos(0, 0);

        return this.avoidCreatures(near);
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
