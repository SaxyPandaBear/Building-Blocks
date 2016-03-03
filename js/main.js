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
    
    //vars
    var inputOn = false; //start the game without game input - only on the playable character, blocks are not affected.
    
    var player; //player character
    var blocks; //group for blocks to use
    var longBlock1, longBlock2, longBlock3; //block1
    var smallBlock1, smallBlock2, smallBlock3, smallBlock4; //block2
    var ground; //group for ground platforms
    var exit; //sprite for the exit door
    var gameTimer; //times the level
    var gameTimerText; //displays text for the game time
    var fade; //image of a black screen that is faded in gradually as the game progresses.
    var wonGame = false; //boolean to keep track if the game has been won to stop the timer and reset the alpha of the fader
    
    var playerControl; //player controls toggle separately from the mouse
    
    var mouseBody; //from http://phaser.io/examples/v2/p2-physics/pick-up-objec
    var mouseConstraint; //from http://phaser.io/examples/v2/p2-physics/pick-up-objec
    
    var sounds; //list of sounds
    var waiting, victory, gameMusic; //different sounds in the game.
    
    function preload() {
        //different blocks
        game.load.image('block1', 'assets/images/block1.png'); //long rectangle
        game.load.image('block2', 'assets/images/block2.png'); //small square
        game.load.image('ground', 'assets/images/platform.png'); //ground platform
        
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
        gameTimer.loop(Phaser.Timer.MINUTE, completeGame, this); //timer for the overarching game
        
        fade = game.add.sprite(0, 0, 'fade'); fade.scale.x += 10; fade.scale.y += 10; //make sure the image fits over the screen
        fade.alpha = 0; //make it invisible to start
        
        //tween our fade image to begin after a 40 second delay, and tweens opacity over a period of 20 seconds
        game.add.tween(fade).to( { alpha: 1}, Phaser.Timer.SECOND * 20, Phaser.Easing.Linear.None, true, Phaser.Timer.SECOND * 40, 0, false);
        
        //ground stuff
        ground = game.add.group(); //group for ground entities
        ground.enableBody = true;
        var leftSide = ground.create(-150, game.world.height - 32, 'ground'); leftSide.body.immovable = true;
        var rightSide = ground.create(game.world.width - 100, game.world.height - 100, 'ground'); rightSide.body.immovable = true;
        
        //put the door on the right side
        game.add.sprite(game.world.width - 75, game.world.height - 185, 'door');
        
        //player settings and the like
        //spawn player on left side
        player = game.add.sprite(32, game.world.height - 100, 'player');
        game.physics.p2.enable(player); //enable physics for player
        player.animations.add('left', [3,4,5], 10, true);
        player.animations.add('right', [6,7,8], 10, true);
        //NOTE: idle frame is player.frame = 1
        player.body.gravity.y = 500;
        player.frame = 1;
        
        //create audio
        waiting = game.add.audio('waiting'); waiting.volume = 1;
        victory = game.add.audio('victory'); victory.volume = 0.3;
        gameMusic = game.add.audio('gameMusic'); gameMusic.volume = 0.6;
        sounds = [waiting, victory, gameMusic];
        game.sound.setDecodedCallback(sounds, toggleGame, this); 
    }

    function update() {
        
        //only allow keyboard inputs if inputOn is toggled to true
        if (inputOn)
        {
            game.input.keyboard.enabled = true;
        }
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
    
    //use button to start or reset game - disables input and resets blocks
    function toggleGame() {
        inputOn = !inputOn;
    }
    
    //function that is called if the player reaches the door and overlaps with it
    function reachGoal() {
        wonGame = true; //this means that they beat the level - in this case, game
        
        //stop timers
        gameTimer.stop();
        fadeTimer.stop();
        
        completeGame(); //skip to completeGame()
    }
    
    //shows a completed level - in a sense, just ends the game.
    function completeGame() {
        inputOn = false; //disable input
        game.input.enabled = false; //disable all user input for now. no need to reset.
        
        if (wonGame)
        {
            //if the player has won the game, then we display a message that is encouraging, and play a happy sound.
            var text = game.text.add();
            victory.play();
        }
        else
        {
            //otherwise, we just tell them that they lost, with no sound.
        }
    }
};
