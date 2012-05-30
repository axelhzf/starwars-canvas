(function () {
    "use strict";

    var StarWars = function (canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.$canvas = $(this.canvas);
        this.context = this.canvas.getContext('2d');
        this.backgroundColor = "#000";
        this.score = 0;
    };

    StarWars.prototype = {
        init : function () {
            var self = this;
            self.setBackgroundColor();
            self.loadSprites().done(function () {
                self.xwing = new StarWars.Xwing(self.context, self.sprites.xwing);
                self.visibleObjects = [];

                self.lastTime = new Date().getTime();

                setInterval(function () {
                    self.draw();
                }, 1000 / 60);

                setInterval(function () {
                    self.addTieFighter();
                }, 1500);

                setInterval(function () {
                    self.addPlasma();
                }, 2000);

            });
        },

        addTieFighter : function () {
            var tieFighter = new StarWars.TieFighter(this.context, this.sprites.tieFighter);
            this.visibleObjects.push(tieFighter);
        },

        addPlasma : function () {
            var plasma = new StarWars.Plasma(this.context, this.sprites.plasma);
            this.visibleObjects.push(plasma);
        },

        setBackgroundColor : function () {
            this.$canvas.css('background-color', this.backgroundColor);
        },

        clearCanvas : function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        },

        draw : function () {
            var self = this;
            var time = new Date().getTime();
            var dt = time - this.lastTime;
            this.lastTime = time;

            self.clearCanvas();

            self.xwing.draw(dt);
            _.each(self.visibleObjects, function (visibleObject) {
                visibleObject.draw(dt);
            });

            var collisions = self.collisions();
            self.updateScore(collisions);
            self.drawScore();
            self.removeNoVisibleObjects();
        },

        updateScore : function (collisions) {
            this.score = _.reduce(collisions, function (memo, num) {
                return memo + num.score;
            }, this.score);
        },

        drawScore : function () {
            var textWidth = this.context.measureText(this.score);
            this.context.fillStyle = "#FFFB1C";
            this.context.font = "30px sans-serif";
            this.context.fillText(this.score, 5, 25);
        },

        collisions : function () {
            var self = this;
            var collisions = [];
            _.each(self.visibleObjects, function (visibleObject) {
                if (self.xwing.intersectRect(visibleObject)) {
                    visibleObject.destroy();
                    collisions.push(visibleObject);
                }
            });
            return collisions;
        },

        removeNoVisibleObjects : function () {
            var self = this;
            self.visibleObjects = _.filter(self.visibleObjects, function (visibleObject) {
                return !visibleObject.isDeletable();
            });
        },

        // plasma.png - (30 x 30)
        // tieFighter.png - (30 x 30)
        // xwing.png - (50 x 33)
        loadSprites : function () {
            var self = this;
            var images = ["plasma", "xwing", "tieFighter"];
            var promises = [];
            this.sprites = {};
            _.each(images, function (image) {
                promises.push(self.loadSprite(image));
            });
            var masterPromise = $.when.apply($, promises);
            return masterPromise;
        },

        loadSprite : function (sprite) {
            var deferred = $.Deferred();
            var promise = deferred.promise();

            var img = new Image();
            img.onload = function () {
                deferred.resolve();
            };
            img.src = 'images/' + sprite + ".png";
            this.sprites[sprite] = img;

            return promise;
        }
    };

    StarWars.Xwing = function (context, sprite) {
        this.context = context;
        this.sprite = sprite;
        this.x = 0;
        this.y = 0;
        this.speed = {
            x : 3,
            y : 3
        };
    };

    StarWars.Xwing.prototype = {
        draw : function (dt) {
            this.updateMovement();
            this.context.drawImage(this.sprite, this.x, this.y);
        },

        updateMovement : function () {
            if (keydown.left) {
                this.x = this.x - this.speed.x;
            }
            if (keydown.right) {
                this.x = this.x + this.speed.x;
            }
            if (keydown.up) {
                this.y = this.y - this.speed.y;
            }
            if (keydown.down) {
                this.y = this.y + this.speed.y;
            }

            var rect = this.rect();
            if (rect.top < 0) {
                this.y = 0;
            } else if (rect.bottom > this.context.height) {
                this.y = this.context.height - this.sprite.height;
            }

            if (rect.left < 0) {
                this.x = 0;
            } else if (rect.right > this.context.width) {
                this.x = this.context.width - this.sprite.width;
            }
        }
    };

    StarWars.TieFighter = function (context, sprite) {
        this.init(context, sprite);
        this.score = -2;
    };

    StarWars.Plasma = function (context, sprite) {
        this.init(context, sprite);
        this.score = 1;
    };

    var visualObjectMethods = {
        rect : function () {
            return {
                top : this.y,
                bottom : this.y + this.sprite.height,
                left : this.x,
                right : this.x + this.sprite.width
            };
        },

        isVisible : function (limit) {
            if (limit) {
                var rect = this.rect();
                if (limit === 'top') {
                    return rect.bottom < 0;
                } else if (limit === 'bottom') {
                    return rect.top > this.context.canvas.height;
                } else if (limit === 'left') {
                    return rect.right > 0;
                } else if (limit === 'right') {
                    return rect.left > this.context.canvas.width;
                }
            }
        },

        intersectRect : function (other) {
            var selfRect = this.rect();
            var otherRect = other.rect();

            var intersectY = ((selfRect.top > otherRect.top) && (selfRect.top < otherRect.bottom)) || ((selfRect.bottom > otherRect.top) && (selfRect.bottom < otherRect.bottom));
            var intersectX = ((selfRect.left > otherRect.left) && (selfRect.left < otherRect.right)) || ((selfRect.right > otherRect.left) && (selfRect.right < otherRect.right));
            return intersectX && intersectY;
        }
    };

    var plasmaAndTieMethods = {
        init : function (context, sprite) {
            this.context = context;
            this.sprite = sprite;
            this.randomSpeed();
            this.randomPosition();
            this.willBeDeleted = false;
        },

        draw : function (dt) {
            this.x = this.x - dt / this.speed.x;
            this.context.drawImage(this.sprite, this.x, this.y);
        },

        isDeletable : function () {
            var result = this.willBeDelete || (!this.isVisible("left"));
            return result;
        },

        destroy : function () {
            this.willBeDelete = true;
        },

        randomPosition : function () {
            this.x = this.context.canvas.width;
            this.y = Math.floor(Math.random() * this.context.canvas.height);
        },

        randomSpeed : function () {
            this.speed = {
                x : Math.floor(Math.random() * 5) + 10
            };
        }
    };

    _.extend(StarWars.Xwing.prototype, visualObjectMethods);
    _.extend(StarWars.TieFighter.prototype, visualObjectMethods, plasmaAndTieMethods);
    _.extend(StarWars.Plasma.prototype, visualObjectMethods, plasmaAndTieMethods);

    window.StarWars = StarWars;
}());












