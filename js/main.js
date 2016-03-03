window.onload = function() {
    // You might want to start with a template that uses GameStates:
    //     https://github.com/photonstorm/phaser/tree/master/resources/Project%20Templates/Basic
    
    // You can copy-and-paste the code from any of the examples at http://examples.phaser.io here.
    // You will need to change the fourth parameter to "new Phaser.Game()" from
    // 'phaser-example' to 'game', which is the id of the HTML element where we
    // want the game to go.
    // The assets (and code) can be found at: https://github.com/photonstorm/phaser/tree/master/examples/assets
    // You will need to change the paths you pass to "game.load.image()" or any other
    // loading functions to reflect where you are putting the assets.
    // All loading functions will typically all be found inside "preload()".
    
    "use strict";
    
    var game = new Phaser.Game( 800, 600, Phaser.AUTO, 'game', { preload: preload, create: create, update: update } );
    
    var player; //player character
    
    //different types of blocks used, but no real need for groups
    var tetris1, tetris2, tetris3;
    var blocks; //group for blocks for collision with player
    
    var exit; //sprite for the exit door
    var timeValue = 60; //60 seconds
    var gameTimer; //times the level - used to initiate the countdown function
    var gameTimerText; //displays text for the game time
    var fade; //image of a black screen that is faded in gradually as the game progresses.
    var fadeTween; //tween of fade image
    var wonGame = false; //boolean to keep track if the game has been won to stop the timer and reset the alpha of the fader
    
    var playerControl; //player controls toggle separately from the mouse
    
    var mouseBody; //from http://phaser.io/examples/v2/p2-physics/pick-up-objec
    var mouseConstraint; //from http://phaser.io/examples/v2/p2-physics/pick-up-objec
    
    var waiting, victory, gameMusic; //different sounds in the game.
    
    function preload() {
        //different blocks
        game.load.image('tetrisblock1', 'assets/images/tetrisblock1.png');
        game.load.image('tetrisblock2', 'assets/images/tetrisblock2.png');
        game.load.image('tetrisblock3', 'assets/images/tetrisblock3.png');
        
        //physics data
        game.load.physics('physicsData', 'assets/images/sprites.json');
                
        game.load.image('background', 'assets/images/background.jpg'); //background image
        
        game.load.image('fade', 'assets/images/fade.png'); //used to tween alpha to fade the screen to black over time
        
        game.load.image('door', 'assets/images/door.png'); //cut down from the sprite sheet
        
        game.load.spritesheet('player', 'assets/images/player.png', 60, 77); //player character
        
        //sounds
        game.load.audio('waiting', ["assets/music/30-second-Jeopardy-Theme.mp3", "assets/music/30-second-Jeopardy-Theme.ogg", "assets/music/30-second-Jeopardy-Theme.wav"]);
        game.load.audio('victory', ["assets/sfx/round_end.wav", "assets/sfx/round_end.mp3", "assets/sfx/round_end.ogg"]);
        game.load.audio('gameMusic', ["assets/music/Pokemon Blue_Red - Route 4.wav", "assets/music/Pokemon Blue_Red - Route 4.ogg", "assets/music/Pokemon Blue_Red - Route 4.mp3"]);
        
    }
    
    function create() {
        game.physics.startSystem(Phaser.Physics.P2JS); //start physics engine
        game.physics.p2.gravity.y = 500; //gravity for the game
        
        //mouse controls are accounted for in other code
        playerControl = game.input.keyboard.createCursorKeys(); //keyboard controls
        
        game.add.sprite(0,0,'background'); //background image that everything is laid on top of
        //create timers
        gameTimer = game.time.create(false);
        gameTimer.loop(Phaser.Timer.SECOND, countdown, this); //timer for the overarching game
        gameTimer.start();
        
        fade = game.add.sprite(0, 0, 'fade'); fade.scale.x += 10; fade.scale.y += 10; //make sure the image fits over the screen
        fade.alpha = 0; //make it invisible to start
        
        //tween our fade image to begin after a 40 second delay, and tweens opacity over a period of 20 seconds
        fadeTween = game.add.tween(fade).to( { alpha: 1}, Phaser.Timer.SECOND * 20, Phaser.Easing.Linear.None, true, Phaser.Timer.SECOND * 40, 0, false);
        
        //put the door on the right side
        exit = game.add.sprite(game.world.width - 75, game.world.height - 500, 'door');
        
        //player settings and the like
        //spawn player on left side
        player = game.add.sprite(32, game.world.height - 100, 'player');
        game.physics.p2.enable(player); //enable physics for player - try arcade physics for the player since we don't need p2 for it
        player.animations.add('left', [3,4,5], 10, true);
        player.animations.add('right', [6,7,8], 10, true);
        //NOTE: idle frame is player.frame = 1
        player.frame = 1;
        
        //create audio
        waiting = game.add.audio('waiting'); waiting.volume = 1; waiting.loop = true;
        victory = game.add.audio('victory'); victory.volume = 0.3;
        gameMusic = game.add.audio('gameMusic'); gameMusic.volume = 0.6; gameMusic.loop = true;
        
        //start with the waiting sound
        waiting.play();
        
        //need text
        gameTimerText = game.add.text(32, 32, "Time Remaining: " + timeValue, {fontSize: '32px', fill: '000000'})
        
        
        
        //Block stuff
        tetris1 = game.add.sprite(300, 100, 'tetrisblock1');
        tetris2 = game.add.sprite(375, 200, 'tetrisblock2');
        tetris3 = game.add.sprite(450, 300, 'tetrisblock3');
        
        //  Create collision group for the blocks
        var blockCollisionGroup = game.physics.p2.createCollisionGroup();
        
        //create collision group for the player
        var playerGroup = game.physics.p2.createCollisionGroup();
        player.body.setCollisionGroup(playerGroup);
        
        player.body.collides(blockCollisionGroup); //basic collision
    
        //  This part is vital if you want the objects with their own collision groups to still collide with the world bounds
        //  (which we do) - what this does is adjust the bounds to use its own collision group.
        game.physics.p2.updateBoundsCollisionGroup();
    
        //  Enable the physics bodies on all the sprites
        game.physics.p2.enable([ tetris1, tetris2, tetris3 ], false);
    
        tetris1.body.clearShapes();
        tetris1.body.loadPolygon('physicsData', 'tetrisblock1');
        tetris1.body.setCollisionGroup(blockCollisionGroup);
        tetris1.body.collides([blockCollisionGroup, playerGroup]);
    
        tetris2.body.clearShapes();
        tetris2.body.loadPolygon('physicsData', 'tetrisblock2');
        tetris2.body.setCollisionGroup(blockCollisionGroup);
        tetris2.body.collides([blockCollisionGroup, playerGroup]);
    
        tetris3.body.clearShapes();
        tetris3.body.loadPolygon('physicsData', 'tetrisblock3');
        tetris3.body.setCollisionGroup(blockCollisionGroup);
        tetris3.body.collides([blockCollisionGroup, playerGroup]);   
    
        // create physics body for mouse which we will use for dragging clicked bodies
        mouseBody = new p2.Body();
        game.physics.p2.world.addBody(mouseBody);
        
        // attach pointer events
        game.input.onDown.add(click, this);
        game.input.onUp.add(release, this);
        game.input.addMoveCallback(move, this);
    }

    function update() {
        if (timeValue == 0)
            completeGame(); //if the timer has run out, then we immediately kick out to the end of the game level
        if (checkOverlap(player, exit)) //if the player overlaps with the exit, we win the game
            reachGoal();
    }
    
    function click(pointer) {

        var bodies = game.physics.p2.hitTest(pointer.position, [ tetris1.body, tetris2.body, tetris3.body ]);
    
        // p2 uses different coordinate system, so convert the pointer position to p2's coordinate system
        var physicsPos = [game.physics.p2.pxmi(pointer.position.x), game.physics.p2.pxmi(pointer.position.y)];
    
        if (bodies.length)
        {
            var clickedBody = bodies[0];
        
            var localPointInBody = [0, 0];
            // this function takes physicsPos and coverts it to the body's local coordinate system
            clickedBody.toLocalFrame(localPointInBody, physicsPos);
        
            // use a revoluteContraint to attach mouseBody to the clicked body
            mouseConstraint = this.game.physics.p2.createRevoluteConstraint(mouseBody, [0, 0], clickedBody, [game.physics.p2.mpxi(localPointInBody[0]), game.physics.p2.mpxi(localPointInBody[1]) ]);
        }   

    }

    function release() {

        // remove constraint from object's body
        game.physics.p2.removeConstraint(mouseConstraint);

    }

    function move(pointer) {

        // p2 uses different coordinate system, so convert the pointer position to p2's coordinate system
        mouseBody.position[0] = game.physics.p2.pxmi(pointer.position.x);
        mouseBody.position[1] = game.physics.p2.pxmi(pointer.position.y);

    }
    
    function checkOverlap(spriteA, spriteB) {

        var boundsA = spriteA.getBounds();
        var boundsB = spriteB.getBounds();

        return Phaser.Rectangle.intersects(boundsA, boundsB);

    }
    
    //counts down the timer in a simple manner
    function countdown() {
        timeValue -= 1; //counts down by 1 every second from a timer. Simple.
        gameTimerText.text = "Time Remaining: " + timeValue; //updates the timer text
    }
    
    //function that is called if the player reaches the door and overlaps with it
    function reachGoal() {
        wonGame = true; //this means that they beat the level - in this case, game
        
        //stop timers
        gameTimer.stop();
        fadeTween.stop();
        
        player.kill();
        
        completeGame(); //skip to completeGame()
    }
    
    //shows a completed level - in a sense, just ends the game.
    function completeGame() {        
        if (waiting.isPlaying)
            waiting.stop();
        
        gameMusic.play();
        
        if (wonGame)
        {
            //if the player has won the game, then we display a message that is encouraging, and play a happy sound.
            var text = game.add.text(game.world.centerX, game.world.centerY, "You win!\nIf music isn't playing,\nit didn't \nfinish loading", {fontSize: '32px', fill: '#000000'});
        }
        else
        {
            //otherwise, we just tell them that they lost, with no sound.
            var text = game.add.text(game.world.centerX, game.world.centerY, "Game Over\nIf music isn't playing,\nit didn't \nfinish loading", {fontSize: '32px', fill: '#FF0000'});
        }
    }
};
