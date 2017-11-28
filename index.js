let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');

document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


// Star

let SPEED = 20;
let STARNUMBER = 300;
let StarStream = Rx.Observable.range(1, STARNUMBER)
                    .map(() => {
                        return {
                            x: parseInt(Math.random() * canvas.width),
                            y: parseInt(Math.random() * canvas.height),
                            size: Math.random() * 2 + 1,
                        }
                    })
                    .toArray()
                    .flatMap((starArray) => {
                        return Rx.Observable.interval(SPEED)
                            .map(() => {
                                starArray.forEach(element => {
                                    if(element.y > canvas.height) {
                                        element.y = 0;
                                    } else {
                                        element.y += 3;
                                    }
                                });

                                return starArray;
                            })
                    });

function paintStar(stars) {
    // background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // star
    ctx.fillStyle = "#ffffff";
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
    })
}

// PLAYER
let HERO_Y = canvas.height - 30;
let mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove');
let SpaceShip = mouseMove
                    .map((event) => {
                        return {
                            x: event.clientX,
                            y: HERO_Y
                        }
                    })
                    .startWith({
                        x: canvas.width / 2,
                        y: HERO_Y
                    });

function drawTriangle(x, y, width, color, direction) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - width, y);
    ctx.lineTo(x, direction === 'up' ? y - width : y + width);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x - width, y);
    ctx.fill();
}

function paintSpaceShip(x,y) {
    drawTriangle(x, y, 20, 'green', 'up');
}

function renderScene(actors) {
    paintStar(actors.stars);
    paintSpaceShip(actors.spaceship.x, actors.spaceship.y);
    paintEnemies(actors.enemies);
    paintHeroShots(actors.heroShots, actors.enemies);
}

const playerFiring = Rx.Observable
                        .merge(
                            Rx.Observable.fromEvent(canvas, 'click'),
                            Rx.Observable.fromEvent(canvas, 'keydown')
                                .filter(function(evt) {
                                    return evt.keycode === 32;
                                })
                        )
                        .sample(Rx.Observable.interval(200));

let HeroShots = Rx.Observable
                    .combineLatest(
                        playerFiring,
                        SpaceShip,
                        function(shotEvents, spaceShip) {
                            return {
                                x: spaceShip.x
                            }
                        }
                    )
                    .scan((shotArray, shot) => {
                        shotArray.push({
                            x: shot.x,
                            y: HERO_Y,
                        })

                        return shotArray;
                    }, [])


function paintHeroShots(heroShots, enemies) {
    heroShots.forEach((shot, i) => {
        for(let l = 0; l < enemies.length; l += 1) {
            const enemy = enemies[l];
            if(!enemy.isDead && collisions(shot, enemy)) {
                enemy.isDead = true;
                shot.x = shot.y = -100;
                break;
            }
        }
        shot.y -= 5;
        drawTriangle(shot.x, shot.y, 5, 'blue', 'up');
    })
}


// ENEMIES
const ENEMY_FREQ = 1000;
const ENEMY_SHOT_FREQ = 500;
const SHOOTING_SPEED = 10;
let Enemies = Rx.Observable.interval(ENEMY_FREQ)
                .scan((makeEnemyArr) => {
                    const enemy = {
                        x: parseInt(Math.random() * canvas.width),
                        y: -30,
                        shots: [],
                    }

                    Rx.Observable.interval(ENEMY_SHOT_FREQ)
                        .subscribe(() => {
                            if(!enemy.isDead) {
                                enemy.shots.push({
                                    x: enemy.x, 
                                    y: enemy.y
                                });
                            }       

                            enemy.shots = enemy.shots.filter(isVisble);
                        })

                    makeEnemyArr.push(enemy);
                    return makeEnemyArr.filter(isVisble).filter((enemy) => {
                        return !(enemy.isDead && enemy.shots.length === 0)
                    })
                }, []);

function paintEnemies(enemies) {
    enemies.forEach(enemy => {
        enemy.x = enemy.x + (
            Math.random() * 10 - 5
        );
        enemy.y += 2;

        if(!enemy.isDead) {
            drawTriangle(enemy.x, enemy.y, 20, 'red', 'down');
        }

        enemy.shots.forEach(shot => {
            shot.y += SHOOTING_SPEED;
            drawTriangle(shot.x, shot.y, 5, 'yellow', 'down');
        })
    })
}

function isVisble(obj) {
    return obj.x > -40 && obj.x < canvas.width + 40
        && obj.y > -40 && obj.y < canvas.height + 40;
}

// Collisions
function collisions(obj1, obj2) {
    return (obj1.x > obj2.x - 20 && obj1.x < obj2.x + 20 
            && obj1.y > obj2.y - 20 && obj1.y < obj2.y + 20);
}

// GAME

// function gameOver(ship, enemies) {
//     enemies.some((enemy) => {
//         if(collisions(ship, enemy)) {
//             return true;
//         }

//         return enemy.shots.some((shot) => {
//             return collisions(ship, shot);
//         })
//     })
// }

let Game = Rx.Observable
            .combineLatest(
                StarStream, SpaceShip, Enemies, HeroShots,
                function(stars, spaceship, enemies, heroShots) {
                    return {
                        stars,
                        spaceship,
                        enemies,
                        heroShots,
                    }
                }
            )
            .sample(Rx.Observable.interval(20))
            //.takeWhile(actors => gameOver(actors.spaceship, actors.enemies));
            
Game.subscribe(renderScene);
