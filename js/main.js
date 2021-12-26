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

    getVelocity() {
        if (Date.now() - this.lastAte > 10000) {
            if (Date.now() - this.lastAte > 20000) {
                this.die();
                return this.velocity;
            }
        }


        const inR = this.game.inRadius(this, this.alertRadius).filter(filterPrey);

        if (inR.length === 0) return this.velocity; // todo
        this.chasingPrey = inR[ 0 ];
        let prey = inR[ 0 ];


        if (prey.coord.sub(this.coord).innerDist() <= 3) {
            console.log("I killed", this.type);
            this.lastAte = Date.now();
            prey.die();
            return this.velocity;
        }

    }
}

class Deer extends Creature {
    constructor(view, coord, game) {
        super(CreatureTypes.Deer, view, coord, game);
    }

    getVelocity() {
        // escape wolves, flock
    }

}

class Hare extends Creature {
    constructor(view, coord, game) {
        super(CreatureTypes.Hare, view, coord, game);
    }

    getVelocity(){
        // escape all, wander
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
