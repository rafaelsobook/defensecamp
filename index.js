import BABYLON from "./_snowpack/pkg/babylonjs.js"
import * as GUI from "./_snowpack/pkg/babylonjs-gui.js"
import "./_snowpack/pkg/babylonjs-loaders.js"
import Conversation from "./_snowpack/pkg/rpg-convers.js"

import warriors from "./details/warriorDet.js"
import recruitsInfo from "./details/recruitInfo.js"
import kingsGuardsSpeech from "./details/kingsGuardSpeech.js"

const conversation = new Conversation(document, 50)
const canvas = document.querySelector("canvas")
const startBtn = document.getElementById("start")
const waveTitle = document.getElementById("waveTitle")
const waveCount = document.getElementById("waveCount")
const waveCont = document.querySelector(".wave-container")
// recruit buttons and container
const recruitContainer = document.querySelector(".recruit-container")
const recruitLists = document.querySelectorAll(".list")
const recruitBtn = document.querySelector(".recruit-idle-btn")
const closeRecruitBtn = document.querySelector(".close-recruits")
const totalKills = document.getElementById("totalKills")
// notif elements
const popupMessage = document.querySelector(".popup-message")
// loading screen
const loadingCont = document.querySelector(".loading-screen")
const log = console.log

const { Engine, Scene, Vector3, MeshBuilder,
StandardMaterial, Texture, Color3, Matrix, Mesh,
ActionManager, ExecuteCodeAction, Scalar, Sound,
SceneLoader, FreeCamera, HemisphericLight } = BABYLON

class Game{
    constructor(){
        this._engine = new Engine(canvas, true)
        this._currentScene = new Scene(this._engine)
        this.camera = undefined
        this.camVertical = 0
        this.camHorizontal = 0
        this.cameraCont = undefined
        this.camSpd = 15
        this.canPress = true

        // sounds
        this.allSounds = undefined

        // mesh
        this.pawns = []
        this.enemies = []
        this.goingUpMeshes = []
        this.warriorRootMesh = undefined
        this.ladyWarriorMesh = undefined
        this.gladRootMesh = undefined
        this.enemyRootMesh = undefined
        this.rootShadow = undefined

        this.targetBox = undefined
        this.selectedPawn = undefined

        // recource info
        this.recourceInfo = {
            kills: 0
        }

        // wave info
        this.waveInfo = {
            waveNumber: 1,
            countDown: 1 * 1000,
            originCountDown: 1 * 1000,
            waveStarted: false,
            enemyCount: 1,
            originEnemyCount: 1
        }
        this.enemyDetails = {
            _id: "enemy1",
            name: "goblin",
            pos: {x: -30, z: 0},
            hp: 100,
            maxHp: 100,
            spd: 2.5,
            dmg: 20
        },

        this.main()
    }
    popMessage(message, isGameOver, color){
        popupMessage.style.display = "block"
        popupMessage.innerHTML = message
        popupMessage.classList.remove("pop-hide")
        popupMessage.style.color = color ? color : "#f5f5f5"
        if(isGameOver){
            const restartBtn = document.createElement("button")
            restartBtn.addEventListener("click", () => window.location.reload())
            restartBtn.innerHTML ="Restart Game"
            popupMessage.innerHTML = ""
            popupMessage.append(restartBtn)
            return restartBtn.className = "restart-btn"
        }
        setTimeout(() => {
            popupMessage.classList.add("pop-hide")
            setTimeout(() => popupMessage.style.display = "none",350)
        }, 2000)
    }
    _loadSounds(scene){
        const hornStart = new Sound("hornStart", "sounds/hornStart.mp3", scene, null, {
            loop: false, autoplay: false, 
        })
        const hornFinish = new Sound("hornFinish", "sounds/hornFinish.mp3", scene, null, {
            loop: false, autoplay: false, 
        })
        const cuttingTrees = new Sound("hornFinish", "sounds/cuttingTrees.mp3", scene, null, {
            loop: false, autoPlay: false, 
        })
        const slashHit = new Sound("hornFinish", "sounds/slashHit.mp3", scene, null, {
            loop: false, autoplay: false, volume: 5
        })
        this.allSounds = { hornStart, hornFinish, cuttingTrees, slashHit}
    }
    detlaT(){
        return this._engine.getDeltaTime()/1000
    }
    closeGameUI(){
        recruitBtn.style.display = "none"
    }
    openGameUI(){
        recruitBtn.style.display = "block"
    }
    openLoadingScreen(){
        loadingCont.classList.remove("loading-off")
        loadingCont.style.display = "block"        
    }
    hideLoadingScreen(){
        loadingCont.classList.add("loading-off")
        setTimeout(() => loadingCont.style.display = "none", 1000) 
    }
    async importMesh(scene, modelName, scaleSize){
        const Root = await SceneLoader.ImportMeshAsync("", "./models/", `${modelName}.glb`, scene)
        const model = Root.meshes[1]
        model.parent = null
        Root.meshes[0].dispose()
        model.rotationQuaternion = null
        if(scaleSize) model.scaling = new Vector3(scaleSize,scaleSize,scaleSize)
        return model
    }
    async main(){
        await this._HomePage()

        this._engine.runRenderLoop(() => {
            this._currentScene.render()   
        })
        window.addEventListener("resize",()=> this._engine.resize())
        window.addEventListener("keyup", e => {
            if(e.key === " "){
                log(this.enemies)
                log(this.pawns)

                log(`cam position `, this.camera.position)
            }
        })
        recruitBtn.addEventListener("click", () =>{
            recruitContainer.className.includes("isHiding") ? recruitContainer.classList.remove("isHiding") : recruitContainer.classList.add("isHiding") 
        })
        closeRecruitBtn.addEventListener("click", () =>{
            recruitContainer.classList.add("isHiding") 
        })
        recruitLists.forEach(elem => {
            elem.addEventListener("click", e => {
                const toRecruitName = e.target.id
                const pawnDetail =  recruitsInfo.find(det => det.name === toRecruitName)
                if(!pawnDetail) return log("no info found")
                if(!this.pawns.length) {
                    recruitContainer.classList.add("isHiding") 
                    
                    return log("it is game over")
                }
                if(pawnDetail.requiredKill > this.recourceInfo.kills) return this.popMessage(`required ${pawnDetail.requiredKill} kills for ${pawnDetail.name}`)
                this.recourceInfo.kills-=pawnDetail.requiredKill
                this.updateKills()
                const camPos = this.camera.getAbsolutePosition()
                const det = this.createCharacter({...pawnDetail,pos: {x: camPos.x,z: camPos.z}, _id: `pawn${makeRandNum()}${makeRandNum()}`}, this._currentScene)
                det.body.locallyTranslate(new Vector3(0,0,7))
            })
        })
    }
    async _HomePage(){
        this.closeGameUI()
        const homeScene = new Scene(this._engine)

        const cam = new FreeCamera("cam", new Vector3(0,1,-7), homeScene)
        const light = new HemisphericLight("light", new Vector3(0,5,0), homeScene)        
        new Sound("medeivalSound", "sounds/medeivalSound.mp3", homeScene, null, {
            autoplay: true, volume: .8, loop: true
        })
        this.createGround(homeScene, 10, "./images/textures/groundTex.jpg", 40)

        const Gate = await SceneLoader.ImportMeshAsync("", "./models/", "gate.glb", homeScene)
        const gate = Gate.meshes[1]//cliff
        gate.parent = null;
        gate.rotationQuaternion = null
        gate.scaling = new Vector3(.6,.6,.6)
        gate.addRotation(0,Math.PI,0)
        gate.position = new Vector3(0,0,3)

        const Warrior = await SceneLoader.ImportMeshAsync("", "./models/", "warrior.glb", homeScene)
        Warrior.meshes[0].addRotation(0,Math.PI,0)
        this.createSky(homeScene)
        await homeScene.whenReadyAsync()
        this._currentScene.dispose()
        this._currentScene = homeScene

        startBtn.style.display="block"
        startBtn.addEventListener("click", async () => {
            startBtn.style.display="none"
            await this._MainGame()
        })
    }
    async _MainGame(){
        this.openLoadingScreen()
        this.closeGameUI()
        this.updateKills()
        const scene = new Scene(this._engine)
        const cam = this.initCamera(scene)

        this.createCamBlocker({x: 0,y:0,z: 25}, scene, 0, () => {
            this.camera.locallyTranslate(new Vector3(0,0,-this.camSpd*4  * this.detlaT()))
        })
        this.createCamBlocker({x: -30,y:0,z: 0}, scene, Math.PI/2, () => {
            this.camera.locallyTranslate(new Vector3(this.camSpd*4  * this.detlaT(),0,0))
        })
        this.createCamBlocker({x: 30,y:0,z: 25}, scene, Math.PI/2, () => {
            this.camera.locallyTranslate(new Vector3(-this.camSpd*4 *this.detlaT(),0,0))
        })
        this.createCamBlocker({x: 0,y:0,z: -25}, scene, 0, () => {
            this.camera.locallyTranslate(new Vector3(0,0,this.camSpd*4 *this.detlaT()))
        })
        const light = new HemisphericLight("light", new Vector3(0,5,0), scene)      
        this.createGround(scene, 20, "./images/textures/campgroundTex.jpg", 120)
        this._loadSounds(scene)
        const medievalSound = new Sound("medeivalSound", "sounds/gameWaveSound.mp3", scene, null, {
            autoplay: true, volume: .8, loop: true
        })

        this.allSounds.medievalSound = medievalSound

        this.createRootShadow(scene)

        this.warriorRootMesh = await SceneLoader.LoadAssetContainerAsync("./models/", "warrior.glb", scene)      
        this.ladyWarriorMesh = await SceneLoader.LoadAssetContainerAsync("./models/", "ladyWarrior.glb", scene)      
        this.gladRootMesh = await SceneLoader.LoadAssetContainerAsync("./models/", "gladiator.glb", scene)      
        
        const Grass = await SceneLoader.ImportMeshAsync("", "./models/", "grass.glb", scene)
        const grass = Grass.meshes[1]
        grass.parent = null
        Grass.meshes[0].dispose()
        let grassLength = 450
        for(var i = 0; i<=grassLength;i++){
            const grassClone = grass.createInstance("grass")
            grassClone.isPickable = false
            const randNumX = Scalar.RandomRange(-30, 30)
            const randNumZ = Scalar.RandomRange(-30, 30)
            const randomScaleNum = .7 + Math.random()*1
            grassClone.position = new Vector3(randNumX,0,randNumZ)
            grassClone.scaling = new Vector3(randomScaleNum,randomScaleNum,randomScaleNum)
            grassClone.addRotation(0,randomScaleNum,0)
        }

        const bigRock = await this.importMesh(scene, "bigRock", .4)
        log(bigRock)
        bigRock.position = new Vector3(0,0,22)

        let bigRocks = 0
        while(bigRocks <= 20){
            const randomScale = Scalar.RandomRange(.3,.7)
            const upperRock = bigRock.clone("rock")
            upperRock.rotationQuaternion = null
            upperRock.position = new Vector3(Scalar.RandomRange(-35,35),0,Scalar.RandomRange(30,34))
            
            upperRock.scaling = new Vector3(randomScale,randomScale,randomScale)
            upperRock.addRotation(0,randomScale,0)

            const leftRock = bigRock.clone("rock")
            leftRock.rotationQuaternion = null
            leftRock.position = new Vector3(Scalar.RandomRange(-35,-40),0,Scalar.RandomRange(-35,35))
            leftRock.scaling = new Vector3(randomScale,randomScale,randomScale)
            leftRock.addRotation(0,randomScale,0)

            
            const rightRock = bigRock.clone("rock")
            rightRock.rotationQuaternion = null
            rightRock.position = new Vector3(Scalar.RandomRange(35,40),0,Scalar.RandomRange(-35,35))
            rightRock.scaling = new Vector3(randomScale,randomScale,randomScale)
            rightRock.addRotation(0,randomScale,0)
            
            bigRocks++
        }

        this.targetBox = MeshBuilder.CreateBox("targetBox", {size: .1}, scene)
        this.targetBox.isPickable = false
        this.targetBox.isVisible = false
        medievalSound.attachToMesh(this.camera)

        warriors.forEach(warrior => {
            this.createCharacter(warrior, scene)
        })

        await scene.whenReadyAsync()
        this._currentScene.dispose()
        this._currentScene = scene
        !this.waveInfo.waveStarted ? this.initiateTalking() : this.waveStart()
        this.hideLoadingScreen()

        this.implementPicking(scene, cam)
        scene.registerAfterRender(() => {
            this.toRender()
        })
    }
    toRender(){
        const detlaT = this._engine.getDeltaTime()/1000
        
        this.camera.locallyTranslate(new Vector3(this.camHorizontal * this.camSpd * detlaT,0,this.camVertical * this.camSpd * detlaT))
        
        this.pawns.forEach(pwn => {
            pwn.moving && pwn.body.locallyTranslate(new Vector3(0,0,pwn.spd * detlaT))
            pwn.target && pwn.body.lookAt(pwn.target.position, 0,0,0)
        })
        this.enemies.forEach(pwn => {
            if(pwn.moving && pwn.target){
                const targPos = pwn.target.position
                pwn.body.lookAt(new Vector3(targPos.x,1,targPos.z),0,0,0)
                pwn.body.locallyTranslate(new Vector3(0,0,pwn.spd * detlaT))
            }
            
        })

        this.goingUpMeshes.forEach(mesh => mesh.locallyTranslate(new Vector3(0,7 * detlaT,0)))
    }
    implementPicking(scene, cam){
        scene.onPointerDown = () =>{
            const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), cam)

            const rayCast = scene.pickWithRay(ray)
            if(rayCast.hit && rayCast.pickedMesh.name.includes("pawn")){
                const pawnId = rayCast.pickedMesh.name
                const thePawn = this.pawns.find(pwn => pwn._id === pawnId)
                if(!thePawn) return log("pawn not found")
                if(this.selectedPawn && this.selectedPawn.body.name.includes("pawn")){
                    const prevPawn = this.pawns.find(pwn => pwn._id === this.selectedPawn?.body.name)
                   
                    if(prevPawn && prevPawn.target === undefined){
                        prevPawn.moving = false
                        prevPawn.attacking = false
                        this.stopAnim(prevPawn.anims, "0idle")
                    }
                }
                this.selectedPawn = thePawn
                this.pawns.forEach(pwn => pwn._id === pawnId ? pwn.nameMesh.isVisible = true : pwn.nameMesh.isVisible = false)
                return this.registerCollisions()
            }
            if(rayCast.hit && rayCast.pickedMesh.name === "ground" && this.selectedPawn){
                if(this.selectedPawn.hp <= 0) return log("the pawn is dead")
                const rayHitPosition = rayCast.pickedPoint
                this.targetBox.position = rayHitPosition
                const {x, z} = this.targetBox.position
                clearInterval(this.selectedPawn.attackingInterval)
                this.selectedPawn.target = undefined
                this.selectedPawn.body.lookAt(new Vector3(x, 1, z), 0,0,0)
                this.selectedPawn.moving = true

                this.selectedPawn.anims.forEach(anim => anim.name ==="running" && anim.play(true))
                return
            }
            // if we click on the enemy
            if(rayCast.hit && rayCast.pickedMesh.name.includes("enemy")){
                if(this.selectedPawn === undefined) return log("no selected pawn")
                const enemyId = rayCast.pickedMesh.name
                const theEnemy = this.enemies.find(pwn => pwn._id === enemyId)
                if(!theEnemy){
                    rayCast.pickedMesh.dispose()
                    return log("enemy not found")
                }
                if(theEnemy.hp <= 0 ) return log("This enemy is dead return")
                // if we have a pawn selected
                if(this.selectedPawn !== undefined){
                    const thePawn = this.pawns.find(pwn => pwn._id === this.selectedPawn.body.name)
                    if(!thePawn) return log("pawn not found")
                    thePawn.moving = true
                    const theCollidedEnemy = thePawn.collidedEnemy.some(enem => enem._id === theEnemy._id)
                    if(theCollidedEnemy){                        
                        thePawn.collidedEnemy = thePawn.collidedEnemy.filter(enemyCollided => enemyCollided._id !== theEnemy._id)
                        thePawn.collidedEnemy.unshift(theEnemy)
                        
                        thePawn.target = theEnemy.body                        
                        return this.attack(thePawn, theEnemy)
                    }
                    clearInterval(thePawn.attackingInterval)
                    // if the enemy I clicked is not near me or not inside my collided enemies
                    // then I will go            
                    log(this.selectedPawn)
                    log(thePawn)
                    this.selectedPawn.target = theEnemy.body
                    this.selectedPawn.moving = true                    
                    this.selectedPawn.attacking = false
                    this.playAnim(this.selectedPawn.anims, "running", true)
                    setInterval(() => {
                        log(this.selectedPawn.moving)
                    }, 1000)
                }
                return
            }
        }
    }
    updateKills(){
        totalKills.innerHTML = `total kills: ${this.recourceInfo.kills}`
    }
    enemyDied(theEnemy){
        this.enemies = this.enemies.filter(enem => enem._id !== theEnemy._id)

        theEnemy.anims.forEach(anim => anim.name === "death" ? anim.play() : anim.stop())
        theEnemy.body.isPickable = false
        theEnemy.body.actionManager.dispose()
        theEnemy.body.actionManager = null

        this.pawns.forEach(pwn => {
            if(pwn.target && pwn.target.name === theEnemy.body.name) {
                if(pwn.moving) this.stopAnim(pwn.anims, "0idle")
                pwn.target = undefined
                pwn.moving = false
                // this.stopAnim(pwn.anims, "0idle")
            }
            pwn.registeredEnemy = pwn.registeredEnemy.filter(enem => enem._id !== theEnemy._id)
            pwn.collidedEnemy = pwn.collidedEnemy.filter(enem => enem._id !== theEnemy._id)
        })
        this.recourceInfo.kills++
        this.updateKills()
        setTimeout(() => {
            theEnemy.body.dispose()
        }, 2000)

        if(!this.enemies.length){
            setTimeout(() => {
                this.openCompletion()
                this.upgradeWave()
                this.initiateTalking()
            }, 5000)
        }
    }
    attack(theAttacker, theTarget){
        const attackAnim = theAttacker.anims.find(anim => anim.name.includes("attack"))
        if(!attackAnim) return log("this person or enemy has no attack animation")

        theAttacker.moving = false
        theAttacker.weaponColl.position.y = -4

        theAttacker.body.lookAt(theTarget.body.position, 0,0,0)
        this.playAnim(theAttacker.anims, attackAnim.name)
    }
    initiateTalking(){
        const waveDetail = kingsGuardsSpeech[this.waveInfo.waveNumber-1]
        const conversationArray = waveDetail.speech
        this.closeGameUI()
        conversation.startConversation(conversationArray, 0, async () => {
 
            this.enemyRootMesh = await SceneLoader.LoadAssetContainerAsync("./models/", `${waveDetail.monsterName}.glb`, this._currentScene)
            this.enemyDetails.name = waveDetail.monsterName
            this.initiateWaveCountdown()
            this.openGameUI()
        })
    }
    initiateWaveCountdown(){
        waveCont.style.display = "flex"
        waveTitle.innerHTML = "Next Wave In"
        waveCount.style.display = "block"
        waveTitle.style.color = "#f5f5f5"
        waveCount.innerHTML = `${this.waveInfo.countDown/1000} seconds`
        let intervalTick = setInterval(() => {
            this.waveInfo.countDown -= 1000
            waveCount.innerHTML = `${this.waveInfo.countDown/1000} seconds`
            if(this.waveInfo.countDown <= 0){
                this.waveStart()
                return clearInterval(intervalTick)
            }
        }, 1000)
    }
    waveStart(){
        this.allSounds.medievalSound.volume = .3
        waveCont.style.display = "flex"
        waveTitle.innerHTML = "Wave Started"
        waveTitle.style.color = "red"
        waveCount.style.display = "none"
        this.allSounds.hornStart.play()
        let currentTimeOut = 1000
        for(var enemCount = 0; enemCount <= this.waveInfo.enemyCount; enemCount++){
            
            setTimeout(() => {
                // const theEnemyDet = this.enemies.find(enem => enem._id === enemId)
                // if(theEnemyDet){
                //     theEnemyDet.moving = true
                //     this.playAnim(theEnemyDet.anims, "running")
                // }
                const enemId = `enemy${makeRandNum()}`
                const randomZ = Scalar.RandomRange(-15,15)
                this.createEnemy({...this.enemyDetails, z:randomZ, spd: 2.2 + Math.random()*1, isMoving: true, _id: enemId }, this._currentScene)
            }, currentTimeOut)
            currentTimeOut += 2000
        }
    }
    upgradeWave(){
        this.waveInfo.waveNumber++
        this.waveInfo.countDown += 2000
        this.waveInfo.originCountDown+= 2000
        this.waveInfo.enemyCount*=2
        this.waveInfo.originEnemyCount*=2
        this.waveInfo.waveStarted = false

        this.enemyDetails.dmg += 20
    }
    initCamera(scene){
        const cam = new FreeCamera("cam", new Vector3(0,0,0), scene)
        const camContainer = MeshBuilder.CreateGround("cameraContainer", { width: .5, height: .5 }, scene)
        cam.parent = camContainer
        camContainer.position = new Vector3(0,15,-5)
        cam.setTarget(new Vector3(0,-5,3))

        this.camera = camContainer
        window.addEventListener("keydown", e => {
            const keypressed = e.key.toLocaleLowerCase()
            
            switch(keypressed){
                case "arrowup":                    
                    
                    this.camVertical = 1
                break;
                case "arrowdown":
                   
                    this.camVertical = -1
                break;
                case "arrowleft":
                   
                    this.camHorizontal = -1
                break;
                case "arrowright":
                   
                    this.camHorizontal = 1
                break;

            }
        })
        window.addEventListener("keyup", e => {
            const keypressed = e.key.toLocaleLowerCase()
            switch(keypressed){
                case "arrowup":
                    this.camVertical =0
                break;
                case "arrowdown":
                    this.camVertical = 0
                break;
                case "arrowleft":
                    this.camHorizontal =0
                break;
                case "arrowright":
                    this.camHorizontal = 0
                break;

            }
        })
        return cam
    }
    createRootShadow(scene){
        this.rootShadow = MeshBuilder.CreateGround("shadow", { width: 2, height:2}, scene)
        const shadowMat= new StandardMaterial("shadowMat", scene)
        shadowMat.diffuseTexture = new Texture("./images/fakeShadow.png", scene)
        shadowMat.diffuseTexture.hasAlpha = true
        shadowMat.useAlphaFromDiffuseTexture = true;
        shadowMat.specularColor = new Color3(0,0,0)
        this.rootShadow.material = shadowMat
        this.rootShadow.position = new Vector3(0,100.5,0)
    }
    putFakeShadow(body, posY){
        const fShadow = this.rootShadow.clone("shadow")
        fShadow.parent = body
        fShadow.position = new Vector3(0,posY,0)
        return fShadow
    }
    createGround(scene, uAndVscale, imgRootUrl, groundSize){
        const ground = MeshBuilder.CreateGround("ground", { width: groundSize, height: groundSize}, scene)
        const groundMat = new StandardMaterial("groudmat", scene)
        const groundTexture = new Texture(imgRootUrl, scene)
        groundTexture.uScale = uAndVscale
        groundTexture.vScale = uAndVscale
        groundMat.diffuseTexture = groundTexture
        groundMat.specularColor = new Color3(0,0,0)
        ground.material = groundMat     
    }
    createSky(scene){
        // Skybox
        var skybox = MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
        var skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("images/skytextures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;        
    }
    createCamBlocker(pos, scene, rotatY, callback){
        const {x,y,z} = pos
        const blocker = MeshBuilder.CreateBox("blocker", { height: 200, width: 300}, scene)
        blocker.position = new Vector3(x,y,z)
        blocker.addRotation(0,rotatY,0)
        blocker.isVisible = false
        blocker.actionManager = new ActionManager(scene)
        blocker.actionManager.registerAction(new ExecuteCodeAction({
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: this.camera
        }, e => {
            callback()
        }))
    }
    createCharacter(pawnDetail, scene){
        const slashSound = this.allSounds.slashHit.clone()
        const {x,z} = pawnDetail.pos
        const body = MeshBuilder.CreateBox(pawnDetail._id, { size: 1, height: 2}, scene)
        body.position = new Vector3(x,1,z)
        body.visibility = 0
        slashSound.attachToMesh(body)

        body.actionManager = new ActionManager(scene)
        body.actionManager.registerAction(new ExecuteCodeAction({
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: this.targetBox
        }, e => {
            const thePawn = this.pawns.find(pwn => pwn._id === pawnDetail._id)
            if(!thePawn) return log("pawn not found")
            thePawn.moving = false
            thePawn.body.locallyTranslate(new Vector3(0,0,-.1))
            this.stopAnim(thePawn.anims, "0idle")
            this.targetBox.position.y = 100
        }))        
        const shadow = this.putFakeShadow(body, -.95)

        const weaponColl = MeshBuilder.CreateGround(`weapon.${pawnDetail._id}`, { width: .6, height: 1.2}, scene)
        weaponColl.parent = body
        weaponColl.position = new Vector3(0,5,.5)
        weaponColl.actionManager = new ActionManager
        weaponColl.isVisible = false

        this.goingUpMeshes.push(weaponColl)
        let rootMesh
        switch(pawnDetail.name){
            case "gladiator":
                rootMesh = this.gladRootMesh
            break;
            case "warrior":
                rootMesh = this.warriorRootMesh
            break
            case "commander":
                rootMesh = this.ladyWarriorMesh
            break;
        }
        const duplicate = rootMesh.instantiateModelsToScene();
        duplicate.animationGroups.forEach(ani => ani.name = ani.name.split(" ")[2] )
        const anims = duplicate.animationGroups

        duplicate.rootNodes[0].parent = body
        duplicate.rootNodes[0].position.y -= 1
        duplicate.rootNodes[0].rotationQuaternion = null
        duplicate.rootNodes[0].addRotation(0,Math.PI,0)
        duplicate.skeletons[0].dispose()

        const {lifeBar,lifebarUi} = this.createLifeBar(body, pawnDetail.hp,pawnDetail.maxHp, scene)
        const nameMesh = this.createTextMesh(pawnDetail.name, "yellow", scene, body)

        this.playAnim(anims, "0idle", true)

        const warriorDet = {
            _id: pawnDetail._id,
            name: pawnDetail.name,
            body,
            nameMesh,
            anims,
            moving: false,
            attacking: false,
            hp: pawnDetail.hp,
            maxHp: pawnDetail.maxHp,
            spd: pawnDetail.spd,
            dmg: pawnDetail.dmg,
            target: undefined,
            weaponColl,
            collidedEnemy: [],
            registeredEnemy: [],
            slashSound,
            attackingInterval: undefined,
            intervalFollow: undefined,
            lifebarUi,
            shadow
        }
        this.pawns.push(warriorDet)
        
        if(this.enemies.length){
            this.registerEnemyAsEnemy(warriorDet._id)
        }
        this.enemies.forEach(sceneEnemies => this.registerPawnsAsEnemy(sceneEnemies._id))
        this.pawns.forEach(scenePwns => this.registerEnemyAsEnemy(scenePwns._id))
        return warriorDet
    }
    createEnemy(pawnDetail, scene){
        if(scene.getMeshByName(pawnDetail._id)) return
        if(!this.pawns.length) return
        const {x,z} = pawnDetail.pos
        const body = MeshBuilder.CreateBox(pawnDetail._id, { size: 1, height: 2}, scene)
        body.position = new Vector3(x,1,z)
        body.visibility = 0
        body.actionManager = new ActionManager(scene)

        this.enemies.forEach(enem => {
            body.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: enem.body
            }, e => {
                body.locallyTranslate(new Vector3(-.1,0,0))
                enem.body.locallyTranslate(new Vector3(.1,0,0))                
            }))
        })
        const duplicate = this.enemyRootMesh.instantiateModelsToScene();
        duplicate.animationGroups.forEach(ani => ani.name = ani.name.split(" ")[2] )
        const anims = duplicate.animationGroups

        const randomSize = .7 + Scalar.RandomRange(.1, .5)
        
        duplicate.rootNodes[0].parent = body
        duplicate.rootNodes[0].position.y -= 1
        duplicate.rootNodes[0].rotationQuaternion = null
        duplicate.skeletons[0].dispose()
        duplicate.rootNodes[0].scaling = new Vector3(randomSize,randomSize,randomSize)
        duplicate.rootNodes[0].addRotation(0,Math.PI,0)

        const nameMesh = this.createTextMesh(pawnDetail.name, "yellow", scene, body)

        this.playAnim(anims, "running", true)

        const weaponColl = MeshBuilder.CreateGround(`weapon.${pawnDetail._id}`, { width: .6, height: 1.2}, scene)
        weaponColl.parent = body
        weaponColl.position = new Vector3(0,5,.5)
        weaponColl.actionManager = new ActionManager
        this.goingUpMeshes.push(weaponColl)
        weaponColl.isVisible = false

        const theTarget = this.pawns[Math.floor(Math.random()*this.pawns.length)]
        
        const { lifeBar, lifebarUi } = this.createLifeBar(body, pawnDetail.hp, pawnDetail.maxHp, scene, 1.5)
        lifebarUi.background = "yellow"
        lifeBar.visibility = .7
        const enemyDet = {
            _id: pawnDetail._id,
            name: pawnDetail.name,
            body,
            weaponColl,
            nameMesh,
            anims,
            moving: pawnDetail.isMoving,
            attacking: false,
            hp: pawnDetail.hp,
            maxHp: pawnDetail.maxHp,
            spd: pawnDetail.spd,
            dmg: pawnDetail.dmg,
            target: theTarget.body ? theTarget.body : undefined,
            intervalFollow: undefined,
            attackingInterval: undefined,
            collidedEnemy: [],
            registeredEnemy: [],
            lifebarUi
        }
        this.enemies.push(enemyDet)

        const targPos = theTarget.body.position
        body.lookAt(new Vector3(targPos.x,1,targPos.z),0,0,0)
        this.registerCollisions()
    }
    createTextMesh(textToDisplay, color, scene, theParent){
        const nameMesh = Mesh.CreatePlane("textToDisplay", 4, scene);        
        nameMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
        const textureForName = GUI.AdvancedDynamicTexture.CreateForMesh(nameMesh);
        nameMesh.isPickable = false
        nameMesh.isVisible = false

        var text1 = new GUI.TextBlock();
        text1.text = textToDisplay
        text1.color = color
        text1.fontSize = 75;
        text1.height = 50
        text1.width = 100
        text1.background = "red"
        textureForName.addControl(text1);    
        nameMesh.parent = theParent
        nameMesh.position = new Vector3(0,1.5,0)        
        return nameMesh
    }
    createLifeBar(parent, hp, maxHp, scene, posY){
        const lifeBar = Mesh.CreatePlane("lifeBar", 4, scene);        
        lifeBar.billboardMode = Mesh.BILLBOARDMODE_ALL;
        const textureForName = GUI.AdvancedDynamicTexture.CreateForMesh(lifeBar);
        lifeBar.parent = parent
        lifeBar.position = new Vector3(0,posY ? posY : 2,0)
        lifeBar.isPickable = false

        const currentLife = (hp/maxHp)*100 * 2
        log(currentLife)
        const lifebarUi = new GUI.Rectangle();
        lifebarUi.width = `${currentLife}px`;
        lifebarUi.height = "35px";
        // lifebarUi.cornerRadius = 20;
        // lifebarUi.color = "Orange";
        // lifebarUi.thickness = 4;
        lifebarUi.background = "green";
        textureForName.addControl(lifebarUi);
        return {lifeBar,lifebarUi}
    }
    dispose(mesh,isActionManager){
        if(isActionManager){
            mesh.actionManager.dispose()
            mesh.actionManager = null
        }else{
            mesh.position.y = 100
            mesh.isPickable = false
            mesh.dispose()
        }
    }
    pawnIsHit(pawn, dmg){
        pawn.hp-=dmg
        const pawnLife = pawn.hp/pawn.maxHp*100
        if(pawnLife <= 25)pawn.lifebarUi.background = "red"
        pawn.lifebarUi.width = `${pawn.hp/pawn.maxHp * 100 * 2}px`
        if(pawn.hp<=0){
            this.dispose(pawn.shadow)
            pawn.nameMesh.dispose()
            this.pawns = this.pawns.filter(pwn => pwn._id !== pawn._id)
            this.dispose(pawn.body, true)
            this.dispose(pawn.weaponColl)
            clearInterval(pawn.attackingInterval)
            this.playAnim(pawn.anims, "death", false)
        }
    }
    playAnimOnce(anims, animName){
        anims.forEach(anim => anim.name === animName && anim.play())
    }
    playAnim(animations, animName, willLoop){
        animations.forEach(anim => {
            if(anim.name === animName){
                anim.stop()
                anim.play(willLoop)
            }else{
                anim.stop()
            }
        })
    }
    stopAnim(animations, animName){
        animations.forEach(anim => anim.name === animName ? anim.play(true) : anim.stop())
    }
    registerPawnsAsEnemy(enemId){        
        this.pawns.forEach(pwn => {
            const theEnemy = this.enemies.find(enem => enem._id === enemId)
            if(!theEnemy) return log("we cannot register pawn our enemies because we can't find ouselves in enemies array")
            const isPawnRegistered = theEnemy.registeredEnemy.some(regpwn => regpwn._id === pwn._id)
            if(isPawnRegistered) return 

            theEnemy.body.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: pwn.body
            }, e => {
                const usDetail = this.enemies.find(enem => enem._id === theEnemy._id)
                if(!usDetail) return log('not found ourselves(enemy)')
                if(usDetail.hp <= 0) return log("we are dead before when we collide with pawn")
                const isPawnCollided = usDetail.collidedEnemy.some(collidedPwn => collidedPwn._id === pwn._id)
                if(!isPawnCollided) usDetail.collidedEnemy.push(pwn)

                // so we can prevent other pawn to distruct this goblin from attacking its target
                if(usDetail.target.name !== pwn.body.name) return log("this is not our target")
                usDetail.moving = false
                usDetail.attacking = true               

                this.stopAnim(usDetail.anims, "0Idle")
                clearTimeout(usDetail.intervalFollow)
                clearInterval(usDetail.attackingInterval)
                usDetail.attackingInterval = setInterval( () => {
                    const usAgain = this.enemies.find(enem => enem._id === usDetail._id)
                    if(!usAgain){
                        log('we did not found myself(goblin) clearAllTimeOut and Interval')
                        clearTimeout(usDetail.intervalFollow)
                        return clearInterval(usDetail.attackingInterval)
                    }
                    const theTargetPawn = this.pawns.find(targPwn => targPwn._id === usDetail.target.name)
                    if(!theTargetPawn){
                        clearInterval(usAgain.attackingInterval)
                        if(this.pawns.length){
                            const newPawnTarg = this.pawns[Math.floor(Math.random()*this.pawns.length)]
                            if(!newPawnTarg) return log("random pawn not found")
                            const isNear = usAgain.collidedEnemy.some(pwncollided =>pwncollided._id === newPawnTarg._id)
                            if(isNear){
                                usAgain.body.lookAt(newPawnTarg.body.position,0,0,0)
                                usAgain.body.locallyTranslate(new Vector3(0,0,-.5))
                                usAgain.target = newPawnTarg.body
                            }else{
                                usAgain.body.lookAt(newPawnTarg.body.position,0,0,0)
                                usAgain.target = newPawnTarg.body
                            }
                            usAgain.moving = true
                            this.playAnim(usAgain.anims, "running", true)
                        }else{
                            this.gameOver()
                            clearInterval(usAgain.attackingInterval)
                            console.warn("The Game Is Over")
                        }
                        return
                    }
                    this.attack(usAgain, pwn)
                }, 1900)
            }))
            theEnemy.body.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionExitTrigger,
                parameter: pwn.body
            }, e => {
                const usDetail = this.enemies.find(enem => enem._id === theEnemy._id)
                if(!usDetail) return log('not found ourselves(enemy)')
                if(usDetail.hp <= 0) return log("we are dead when we exit with pawn")
                
                usDetail.collidedEnemy = usDetail.collidedEnemy.filter(collidedPwn => collidedPwn._id !== pwn._id)
                if(!usDetail.target.name){
                    clearTimeout(usDetail.intervalFollow)
                    return clearInterval(usDetail.attackingInterval)
                }
                // so we can prevent other pawn to distruct this goblin from attacking its target
                if(usDetail.target.name !== pwn.body.name) return log("this is not our target")
                clearTimeout(usDetail.intervalFollow)
                clearInterval(usDetail.attackingInterval)
                usDetail.intervalFollow = setTimeout(() =>{
                    usDetail.moving = true
                    usDetail.attacking = false
                    this.playAnim(usDetail.anims, "running", true)
                }, 300)
            }))

            // weapon collision
            theEnemy.weaponColl.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionExitTrigger,
                parameter: pwn.body
            }, e => {
                const usDetail = this.enemies.find(enem => enem._id === theEnemy._id)
                if(!usDetail) return log('not found ourselves(enemy)')
                if(usDetail.hp <= 0) return log("we are dead before when we attack the pawn")

                const ourEnemyPawn = this.pawns.find(pwnEnem => pwnEnem._id === pwn._id)
                if(!ourEnemyPawn) return log("cannot find the pawn that collides with enemy weapon")
                if(ourEnemyPawn.hp <= 0) return log("pawn that collides in enemy weapon is already dead")
                
                this.pawnIsHit(ourEnemyPawn, usDetail.dmg)
            }))
            theEnemy.registeredEnemy.push(pwn)
        })
    }
    registerEnemyAsEnemy(pawnId){
        this.enemies.forEach(enem => {
            const thePawn = this.pawns.find(pwn => pwn._id === pawnId)
            if(!thePawn) return log("we cannot find ourselves in pawns array")

            const isEnemyRegistered = thePawn.registeredEnemy.some(enmy => enmy._id === enem._id)
            if(isEnemyRegistered) return 

            // weapon collision
            thePawn.weaponColl.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: enem.body
            }, e => {
                const ourCurrentPawn = this.pawns.find(pwn => pwn._id === thePawn._id)
                if(!ourCurrentPawn) return log("pawn not found")
                const currentEnemy = this.enemies.find(pwn => pwn._id === enem._id)
                if(!currentEnemy) return log("enemy not found")
                if(currentEnemy.hp <= 0) return ourCurrentPawn.moving = false               
               
                this.playAnimOnce(currentEnemy.anims, "hit")

                ourCurrentPawn.slashSound.setPlayBackRate = .9 + Math.random()*.4
                ourCurrentPawn.slashSound.play()
                currentEnemy.hp -= ourCurrentPawn.dmg
                currentEnemy.lifebarUi.width = `${(currentEnemy.hp/currentEnemy.maxHp)*100 * 2}px`
                
                if(currentEnemy.hp <= 0) this.enemyDied(currentEnemy)                            
            }))

            // Body collisions 
            thePawn.body.actionManager.registerAction(new ExecuteCodeAction({
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: enem.body
            }, e => {
                const ourCurrentPawn = this.pawns.find(pwn => pwn._id === thePawn.body.name)
                if(!ourCurrentPawn) return log("pawn not found")
                const currentEnemy = this.enemies.find(pwn => pwn._id === enem._id)
                if(!currentEnemy) return log("enemy not found")
                if(currentEnemy.hp <= 0) return

                const isCollidedAlready = ourCurrentPawn.collidedEnemy.some(enemy => enemy._id === currentEnemy._id)
                if(!isCollidedAlready) ourCurrentPawn.collidedEnemy.unshift(currentEnemy)
                
                this.attack(ourCurrentPawn, currentEnemy)

                clearInterval(ourCurrentPawn.attackingInterval)
                ourCurrentPawn.attackingInterval = setInterval(() =>{
                    const thisPawn = this.pawns.find(pwn => pwn._id === ourCurrentPawn.body.name)
                    if(thisPawn.hp <= 0){
                        log(`${thisPawn._id} is dead clearing interval and return `)
                        return clearInterval(thisPawn.attackingInterval)
                    }
                    if(!thisPawn.collidedEnemy.length) {
                        clearInterval(ourCurrentPawn.attackingInterval)
                        return log(`${thisPawn._id} no enemy collided`)
                    }
                    const currentEnemy = this.enemies.find(pwn => pwn._id === thisPawn.collidedEnemy[0]._id)
                    if(!currentEnemy){
                        log("this enemy inside my collidedEnemy is not found")
                        return clearInterval(ourCurrentPawn.attackingInterval)
                    }
                    thisPawn.target = currentEnemy.body
                    this.attack(thisPawn, currentEnemy)
                    setTimeout(() => currentEnemy.body.visibility = 0, 1000)
                }, 2000)
            }))

            // body exit
            thePawn.body.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionExitTrigger,
                parameter: enem.body
            }, e => {
                const ourCurrentPawn = this.pawns.find(pwn => pwn._id === thePawn.body.name)
                if(!ourCurrentPawn) return log("pawn not found")
                
                ourCurrentPawn.collidedEnemy = ourCurrentPawn.collidedEnemy.filter(enemy => enemy._id !== enem._id)
                clearInterval(ourCurrentPawn.attackingInterval)
                if(ourCurrentPawn.target !== undefined){
                    if(enem.body.name === ourCurrentPawn.target.name){
                        clearTimeout(ourCurrentPawn.intervalFollow)
                        clearInterval(ourCurrentPawn.attackingInterval)
                        ourCurrentPawn.intervalFollow = setTimeout(() => {
                            ourCurrentPawn.moving = true
                            ourCurrentPawn.attacking = false
                            this.playAnim(ourCurrentPawn.anims, "running", true)
                        }, 100)
                    }
                }
              
            }))

            thePawn.registeredEnemy.push(enem)
        })
    }
    registerCollisions(){
        this.enemies.forEach(sceneEnemies => this.registerPawnsAsEnemy(sceneEnemies._id))
        this.pawns.forEach(scenePwns => this.registerEnemyAsEnemy(scenePwns._id))
    }
    openCompletion(){
        this.popMessage("Wave Survived", false, "#f5f5f5")
        this.allSounds.hornFinish.play()
        setTimeout(() => this.allSounds.medievalSound.volume = .5, 1000)
    }
    gameOver(){
        this.popMessage("", true)
        this.enemies.forEach(enemy => {
            clearInterval(enemy.attackingInterval)
            enemy.target = undefined
            enemy.moving = false
            enemy.attacking = false
            this.stopAnim(enemy.anims, "0Idle")
        })
    }
}
new Game()

function makeRandNum(){
    return Math.random().toLocaleString().split(".")[1]
}