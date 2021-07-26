const output = document.querySelector("#output");
const input = document.querySelector("#cmd");
const timerDiv = document.querySelector("#timer");
const version = "v0.9c";
let queue = [];
let commands = [];
let persistentDivs = [];
let gameTimer = -10;
let gameTimerID = -10; // currently unused, remove later (also remove id from event)
let gameTimerTime = 0;
let gameTimerActive = false;
let gameTimerPaused = false;
let inputEnabled = false; // Turn off until ready to accept input (failsafe for forceQueue)

/**
 * Game countdown timer
 * @param {*} timeAmt   Time in milliseconds
 * @param {*} func      Function to run after countdown reaches 0
 */
function startGameTimer(timeAmt=10000, func=undefined) {
    if (!gameTimerActive || gameTimerPaused) {
        updateGameTimerDiv();
        gameTimerTime = timeAmt;
        gameTimer = setInterval(()=>{
            if (!gameTimerPaused) {
                gameTimerTime -= 1000;
                if (gameTimerTime <= 0) {
                    stopGameTimer();
                    if (func != undefined) {
                        func.apply(null);
                    }
                }
                else {
                    updateGameTimerDiv();
                }
            }
        }, 1000);
        gameTimerActive = true;
        gameTimerPaused = false;
    }
}

function stopGameTimer() {
    timerDiv.removeEventListener("startTimer", handleTimerStartEvent);
    ++gameTimerID;
    if (gameTimerActive) {
        clearInterval(gameTimer);
        gameTimerTime = 0;
        updateGameTimerDiv();
        gameTimerActive = false;
        gameTimerPaused = false;
    }
} 

function pauseGameTimer() {
    if (gameTimerActive && !gameTimerPaused) {
        // clearInterval(gameTimer);
        gameTimerPaused = true;
        updateGameTimerDiv();
    }
}

function resumeGameTimer() {
    if (gameTimerActive && gameTimerPaused) {
        gameTimerPaused = false;
    }
}

function togglePauseGameTimer() {
    if (gameTimerActive && !gameTimerPaused) {
        pauseGameTimer();
    }
    else if (gameTimerActive && gameTimerPaused) {
        resumeGameTimer();
    }
}

function handleTimerStartEvent(e) {
    console.log("received id: " + e.detail.id);
    console.log("stored id: " + gameTimerID);
    // if (gameTimerID <= e.detail.id) {
    //     startGameTimer(e.detail.time, e.detail.func);
    // }
    startGameTimer(e.detail.time, e.detail.func);
}

function updateGameTimerDiv() {
    timerDiv.innerHTML = "* ".repeat(Math.ceil((gameTimerTime / 1000)));
}

input.addEventListener("keypress", (e) => {
    if (inputEnabled && (e.keyCode == 13 || e.key == "Enter")) {
        if (input.value.length > 0) {
            parseInput(input.value);
            input.value = "";
        }
        else {
            forceOutQueue();
        }
    }
});

class Dialog {
    constructor(text="", delay=0, interval=0, persist=false, newline=true) {
        this.text = text;
        this.delay = delay;
        this.interval = interval;
        this.persist = persist;
        this.newline = newline;
    }
}

class Command {
    /**
     * Creates a command object
     * @param {String} cmd                  String of the command that will be input.
     * @param {function} func               Reference to a function that will be called on successful execution of the command
     * @param {String Array} validArgs      List of valid second words that can follow the first command (action) word.
     *                                      If empty, the command does not require a second word as a target.
     *                                      DO NOT CAPITALIZE OR INCLUDE EXTRA WHITESPACE
     * @param {int} requireArg              -2 = arg not needed, MUST NOT be given
     *                                      -1 = arg not needed, but if given, ignores validArgs
     *                                      0 = arg not needed, but if given, MUST be one in validArgs
     *                                      1 = arg is needed, MUST be one in validArgs
     *                                      2 = arg is needed, but ignores validArgs
     * @param {int} ...args                 Optional arguments passed to func. DO NOT PUT INTO AN ARRAY
     */
    constructor(cmd, func, validArgs=[], requireArg=-2, ...args) {
        this.cmd = cmd.toLowerCase().trim();
        this.func = func;
        this.validArgs = validArgs;
        this.requireArg = requireArg;
        this.extraArgs = args;
    }
    execute(arg="") {
        console.log(arg);
        if (arg == undefined) arg = "";
        const argID = this.validArgs.indexOf(arg.trim().toLowerCase());
        switch (this.requireArg) {
            case -2:
                if (arg.length > 0) {
                    sendOutput([new Dialog(`<span class='error'>'${this.cmd}' does not take any arguments</span>`)]);
                    console.warn("failed to execute case -2");
                }
                else {
                    console.log(this.extraArgs);
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case -2");
                }
                break;
            case -1:
                this.func.apply(this, [arg].concat(this.extraArgs));
                console.log("executed case -1");
                break;
            case 0:
                if (arg.length === 0) {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 0, empty arg");
                }
                else if (argID > -1) {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 0, with arg");
                }
                else {
                    sendOutput([new Dialog(`<span class='error'>invalid argument. argument for '${this.cmd}' is optional, but if provided, must be one of the following:\n[${this.validArgs.join(", ")}]</span>`)]);
                    console.warn("failed to execute case 0");
                }
                break;
            case 1:
                if (arg.length === 0) {
                    sendOutput([new Dialog(`<span class='error'>'${this.cmd}' requires an argument. valid options:\n[${this.validArgs.join(", ")}]</span>`, 0, 0, false)]);
                    console.warn("failed to execute case 1, missing arg");
                }
                else if (argID === -1) {
                    sendOutput([new Dialog(`<span class='error'>invalid argument. valid options:\n[${this.validArgs.join(", ")}]</span></span>`, 0, 0, false)]);
                    console.warn("failed to execute case 1, bad arg");
                }
                else  {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 1");
                }
                break;
            case 2:
                if (arg.length === 0) {
                    sendOutput([new Dialog(`<span class='error'>'${this.cmd}' requires an argument. valid options:\nany</span>`, 0, 0, false)]);
                    console.warn("failed to execute case 2, missing arg");
                }
                else {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 2");
                }
                break;
        }
    }
}

/**
 * Global commands
 */
const _globalCommands = [
     new Command("help", help),
     new Command("clear", () => {clearOutput()}),
     new Command("debug", debug, [], -1),
     new Command("list", (cmdType)=>{
        let locals = [];
        let globals  = [];
        let all = [];
        globalCommands.forEach((cmd) => {
            globals.push(cmd.cmd);
        });
        commands.forEach((cmd) => {
            locals.push(cmd.cmd);
        });
        all = globals.concat(locals);

        switch (cmdType) {
            case "":
                sendOutput([new Dialog(`all commands: ${all.join(", ")}`, 0, 0, false)]);
                break;
            case "all":
                sendOutput([new Dialog(`all commands: ${all.join(", ")}`, 0, 0, false)]);
                break;
            case "local":
                sendOutput([new Dialog(`local commands: ${locals.join(", ")}`, 0, 0, false)]);
                break;
            case "global":
                sendOutput([new Dialog(`global commands: ${globals.join(", ")}`, 0, 0, false)]);
                break;
        }

     }, ["all", "local", "global"], 0)
    //  new Command("restart", restart)
];
let globalCommands = _globalCommands.slice();

class QueueItem {
    constructor(diagArr=[], divArr=[], timerArr=[]) {
        this.diagArr = diagArr;
        this.divArr = divArr;
        this.timerArr = timerArr;
    }    
}

const dialog_test = [
    new Dialog("Hello.", 100, 0, true),
    new Dialog(" This is a test of the string print output.", 50, 1000),
    new Dialog("\nI'm not sure how well this will work", 20, 500),
    new Dialog("\n<span class=\"hint\">Let's find out.</span>", 100, 500)
]
const dialog_test2 = [
    new Dialog("Hello.", 0, 0),
    new Dialog("This is a test of the string print output.", 0, 0),
    new Dialog("I'm not sure how well this will work", 0, 0),
    new Dialog("<span class=\"hint\">Let's find out.</span>", 10, 100)
]

function clearOutput(clearpersistent=false) {
    const outDivs = output.childNodes;
    forceOutQueue();
    for (let i = outDivs.length - 1; i >= 0; i--) {
        output.removeChild(outDivs[i])
        console.log()
    }
    if (clearpersistent) {
        persistentDivs = [];
    }
    else{
        persistentDivs.forEach(element => {
            output.appendChild(element);
        });
    }
    inputEnabled = true;
}

function persistOutput() {
    forceOutQueue();
    persistentDivs = [];
    const get = output.childNodes;
    get.forEach(element => {
        persistentDivs.push(element.cloneNode(true));
    });
}

/**
 * Print line(s) of dialogue to the "terminal"
 * @param {Dialog Array} dialogArr      Array of dialog objects    
 * @param {boolean} triggerGameTimer    Whether or not the end of the queue will trigger the game timer
 * @param {number} timer                Game timer count in milliseconds
 * @param {function} timerFunc          Function to pass to the game timer when it hits 0
 */
function sendOutput(dialogArr, triggerGameTimer=false, timer=10000, timerFunc=undefined) {
    inputEnabled = false; // disable until first output run is given
    if (triggerGameTimer) {
        timerDiv.addEventListener("startTimer", handleTimerStartEvent, {once: true});
    }

    if (queue.length > 0) {
        forceOutQueue();
    }
    let divs = [];
    for (let i = 0; i < dialogArr.length; i++) {
        div = document.createElement("div");
        output.appendChild(div);
        divs.push(div);
        if (dialogArr[i].persist) {
            persistentDivs.push(div);
        }
    }
    // typewriters(dialogArr, divs, 0);
    displayLines(dialogArr, divs, triggerGameTimer, timer, timerFunc);

    output.scrollTop = output.scrollHeight;
}

function parseInput(inputStr) {
    let inputs = inputStr.toLowerCase().trim().split(/\s+/);
    let rawInputs = inputStr.trim().split(/\s+/);
    // console.log(inputs);
    let cmdID = findWithAttr(commands, "cmd", inputs[0]);
    let gCmdID = findWithAttr(globalCommands, "cmd", inputs[0]);
    // console.log(cmdID);
    // console.log(gCmdID);
    if (cmdID > -1) {
        echoInput(rawInputs, false);
        commands[cmdID].execute(inputs.slice(1, inputs.length).join());
        // globalCommands = _globalCommands.slice(); // reset any weird changes
    }
    else if (gCmdID > -1) {
        echoInput(rawInputs, false);
        globalCommands[gCmdID].execute(inputs.slice(1, inputs.length).join());
    }
    else {
        echoInput(rawInputs, true);
    }
}

function echoInput(inputs, err=true) {
    const inputStr = inputs.join(" ");
    // clearOutput(false);
    const echo = [
        new Dialog("<span class=\"echo\">> " + inputStr + "</span>", 0, 0, false)
    ]
    if (err) echo.push(new Dialog(`<span class='error'>command not found: '${inputs[0]}'</span>`, 0, 0, false));
    sendOutput(echo);
}


function forceOutQueue() {
    const event = new CustomEvent("forceOutput");
    output.dispatchEvent(event);
    queue.forEach(item => {
        item["timerArr"].forEach(timer => {
            clearInterval(timer);
            clearTimeout(timer);
        });
        for (let i = 0; i < item["diagArr"].length; i++) {
            item["divArr"][i].innerHTML = item["diagArr"][i].text;
        }
    });
    queue = [];
}


function displayLines(diags, divs, triggerGameTimer, timer, timerFunc) {
    queueItem = new QueueItem(diags, divs, []);
    queue.push(queueItem);
    recursiveLine(diags, divs, 0, 0, queueItem, triggerGameTimer, timer, timerFunc);
}

function recursiveLine(diags, divs, row, charIndex, queueItem, triggerGameTimer, timer, timerFunc) {
    let queuePos = queue.indexOf(queueItem);
    let p = displayPromise(diags, divs, row, charIndex, queuePos, triggerGameTimer, timer, timerFunc);
    console.log(p);
    p.then((timerId)=>{
        charIndex = 0;
        ++row;
        if (row < diags.length) {
            console.log("recursive call");
            recursiveLine(diags, divs, row, charIndex, queueItem, triggerGameTimer, timer, timerFunc);
        }
        else {
            console.log("finished item");
            queuePos = queue.indexOf(queueItem); // Update in case indices changed from prior removal
            queue.splice(queuePos, 1);
            if (triggerGameTimer) {
                // TODO: trigger game timer here
                // startGameTimer(timer, timerFunc);
                const e = new CustomEvent("startTimer", {
                    detail: {
                        time: timer,
                        func: timerFunc,
                        id: timerId
                    }
                });
                timerDiv.dispatchEvent(e);
            }
        }
        console.log("after recursive call");
    }).catch((timerId)=>{
        console.log("forcing output");
    });
}

const displayPromise = (diags, divs, row, charIndex, queuePos, triggerGameTimer, timerTime, timerFunc) => {
    return new Promise((resolve, reject) => {
        const str = diags[row].text;
        const timeout = setTimeout(() => {
            if (diags[row].delay > 0) {
                let timer = setInterval(()=>{
                    let char = str[charIndex];
                    if (char === "<") {
                        charIndex = str.indexOf(">", charIndex); // skip to end of tag
                    }
                    divs[row].innerHTML = str.slice(0, charIndex+1);
                    if (++charIndex >= str.length) {
                        clearInterval(timer);
                        gameTimerID = timeout;
                        resolve(timeout);
                        console.log("timerID: " + timeout);
                    }
                }, diags[row].delay);
                queue[queuePos]["timerArr"].push(timer);
                output.addEventListener("forceOutput", function cancel(e) {
                    console.log("force event consumed");
                    clearInterval(timer);
                    gameTimerID = timeout;
                    reject(timeout); // ! sometimes this doesn't get received
                    console.log("timerID: " + timeout);
                    if (triggerGameTimer) {
                        // TODO: trigger game timer here
                        const ev = new CustomEvent("startTimer", {
                            detail: {
                                time: timerTime,
                                func: timerFunc,
                                id: timeout
                            }
                        });
                        timerDiv.dispatchEvent(ev);
                    }
                }, {once: true});
            }
            else {
                divs[row].innerHTML = str;
                resolve(timeout);
            }
            inputEnabled = true; // reenable input - safe to accept input
        }, diags[row].interval);
        queue[queuePos]["timerArr"].push(timeout);
    });
};

// Adopted from https://stackoverflow.com/questions/7176908/how-can-i-get-the-index-of-an-object-by-its-property-in-javascript
function findWithAttr(array, attr, value) {
    if (array.length < 1) return -1;
    for (let i = 0; i < array.length; i++) {
        try {
            if (array[i][attr] === value) {
                return i;
            }
        }
        catch { // if doesn't exist
            return -1;
        }
    }
    return -1;
}

function findHasAttr(array, attr, value) {
    if (array.length < 1) return -1;
    for (let i = 0; i < array.length; i++) {
        try {
            if (array[i][attr].indexOf(value) > -1) {
                return i;
            }
        }
        catch { // if doesn't exist
            return -1;
        }
    }
}


document.addEventListener("keypress", ()=>{
    input.focus();
    output.scrollTop = output.scrollHeight;
});





/**
 * Story and commands
 */

function debug(...args) {
    stopGameTimer();
    clearOutput(true);
    try {
        const index = findWithAttr(gameScenes, "name", args[0]);
        if (index > -1) {
            gameScenes[index].apply(null);    
        }
        else {
            gameScenes[parseInt(args[0])].apply(null);
        }
    }
    catch {
        let sceneList = [];
        for (let i = 0; i < gameScenes.length; i++) {
            sceneList.push(`${i} : ${gameScenes[i].name}`);
        }
        const debugDiag = [
            new Dialog("To jump to a scene, type 'debug' followed by the ID or name from this list:", 0, 0, true),
            new Dialog(sceneList.join("\n"), 0, 0, true)
        ];
        sendOutput(debugDiag);
    }    
}

function help(loop=false) {
    // persistOutput();
    const dialog_help = [
        new Dialog("look out for <span class='cmd'>hints</span>", 100, 0, false)
    ]
    sendOutput(dialog_help);
    // persistOutput();
    globalCommands = _globalCommands.slice();
    globalCommands.push(new Command("hints", hints));
}

function hints() {
    // persistOutput();
    const dialog_help = [
        new Dialog("they may be of <span class='cmd'>help</span>", 100, 0, false)
    ]
    sendOutput(dialog_help);
    // persistOutput();
    globalCommands = _globalCommands.slice();
}

// todo: make it so that choosing "no" will restore the scene you were just on
// ! will bug you out if you try to restart during a countdown sequence
function restart(last_scene) {
    const dia = [
        new Dialog("are you sure you want to restart? (Y/N)", 50, 0, false),
    ];
    globalCommands = _globalCommands.splice();
    const prompt = [
        new Command("Y", ()=>{start()}),
        new Command("N", ()=>{
            clearOutput(false);
            globalCommands = _globalCommands;
        })
    ];
    globalCommands.push(...prompt)
    sendOutput(dia);
}

function start() {
    stopGameTimer();
    clearOutput(true);
    const dialog_start = [
        new Dialog("ultimo", 100, 1000, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("<span class='cmd'>start</span> day", 100, 1000, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("<span class='hint'>hint: try typing <span class='cmd'>help</span> and hitting enter</span>", 50, 3000, true),
    ];
    
    sendOutput(dialog_start);
    commands = [
        new Command("start", story_day1, ["day", "game"], 0),
        new Command("version", ()=>{
            sendOutput([new Dialog(version, 100, 0, true)]);
        })
    ];
}

function story_day1() {
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape bugfix to stop access to debug screen while countdown is going
    commands = [];
    let clock = ["t-72:00:00", "t-71:00:59", "t-71:00:58", "t-71:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        startGameTimer(4000, ()=>{inputEnabled = true});
        clearOutput(true);
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            inputEnabled = true;
            setTimeout(story_day1_a, 1000);
        }
    }, 1000);
}

function story_day1_a() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you've had a busy day today", 15, 500, true),
        new Dialog("you arrived early at the office", 15, 1000, true),
        new Dialog("you've been hearing <span class='cmd'>murmurs</span>", 15, 1500, true),
        new Dialog("you're not sure what they're saying", 15, 1500, true),
        new Dialog("", 100, 1000, true),
        new Dialog("you've got <span class='cmd'>work</span> to do before going home tonight", 15, 1000, true)
    ];
    commands = [
        new Command("murmurs", story_day1_murmurs),
        new Command("work", story_day1_work),
    ];
    sendOutput(dia, true, 15000, story_day1_work); // 15 seconds to choose your path
}

function story_day1_murmurs() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you overhear them saying <span class='cmd'>something</span> about the moon", 15, 500, true),
        new Dialog("you saw on the weather yesterday that it was going to be a full moon", 15, 1000, true),
        new Dialog(" ", 10, 1500, true),
        new Dialog("it doesn't really matter", 10, 0, true),
        new Dialog("", 100, 1000, true),
        new Dialog("you've got some <span class='cmd'>work</span> to finish", 15, 0, true)
    ];
    commands = [
        new Command("something", story_day1_something),
        new Command("work", story_day1_work),
    ];
    sendOutput(dia, true, 10000, story_day1_work); // 10 seconds to choose your path
}

function story_day1_something() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("\"I'm sure NASA and SpaceX and all them will figure somethin' out.\"", 15, 500, true),
        new Dialog("\"Hail Mary, full of grace...\"", 30, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("you look at the time and see it's 6pm", 15, 0, true),
        new Dialog("you'll have to finish your work tomorrow.", 15, 1000, true)
    ];
    commands = [];
    sendOutput(dia, true, 5000, story_day1_somethingb); // 5 seconds before next day
}

function story_day1_somethingb() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you clock out and headed home", 10, 500, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("the streets are eerily quiet", 10, 0, true),
        new Dialog("", 100, 2000, true),
        new Dialog("the moon looks big tonight", 10, 0, true)
    ];
    commands = [];
    sendOutput(dia, true, 5000, () => {
        story_day2("b");
    }); // 5 seconds before next day
}

function story_day1_work() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you turn in your last assignment", 10, 500, true),
        new Dialog("you clock out and headed home", 10, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("the streets are eerily quiet", 10, 0, true),
        new Dialog("", 100, 2000, true),
        new Dialog("the moon looks big tonight", 10, 0, true)
    ];
    commands = [];
    sendOutput(dia, true, 5000, () => {
        story_day2("a");
    }); // 5 seconds before next day
}

function story_day2(path) {
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape fix to prevent access to debug screen mid-countdown
    commands = [];
    let clock = ["t-48:00:00", "t-47:00:59", "t-47:00:58", "t-47:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        clearOutput(true);
        startGameTimer(4000, () => {inputEnabled = true;});
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            inputEnabled = true;
            if (path=="a") {
                setTimeout(story_day2a, 1000);
            }
            else {
                setTimeout(story_day2b, 1000);
            }
        }
    }, 1000);
}

function story_day2a() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you wake up a little late this morning.", 15, 500, true),
        new Dialog("it seems a bit overcast today.", 30, 1000, true),
        new Dialog("you don't hear any birds.", 10, 1000, true),
        new Dialog("", 15, 0, true),
        new Dialog("you think about putting in some <span class='cmd'>extra hours</span> today.", 15, 2000, true),
        new Dialog("you might give your parents a surprise <span class='cmd'>visit</span>", 15, 1000, true)
    ];
    commands = [
        new Command("extra", story_day2a_work, ["hours"], 1),
        new Command("visit", story_day2a_visit)
    ];
    sendOutput(dia, true, 15000, story_day2a_work); // 15 seconds to choose path
}

function story_day2a_work() {
    stopGameTimer();
    clearOutput(true);
    commands = []
    let dia = [
        new Dialog("you drive to work.", 15, 500, true),
        new Dialog("the streets are strangely empty.", 30, 2000, true),
    ];
    sendOutput(dia, true, 5000, ()=>{
        clearOutput(true);
        commands = [
            new Command("Brevi", story_day2a_brevi1),
            new Command("Mr.", story_day2a_brevi1, ["Brevi"], 1)
        ];
        dia = [
            new Dialog("you arrive at the office.", 15, 500, true),
            new Dialog("there's only one car.", 30, 1000, true),
            new Dialog("", 30, 0, true),
            new Dialog("you recognize it belonging to your kind elderly supervisor, <span class='cmd'>Mr. Brevi</span>", 30, 1000, true)
        ];
        sendOutput(dia, true, 5000, story_day2a_brevi1); // 5 seconds before defaulting
    });
}

function story_day2a_brevi1() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("Brevi", story_day2a_brevi2),
        new Command("Mr.", story_day2a_brevi2, ["brevi"], 1),
        new Command("walk", story_day2a_brevi1_walk),
    ];
    let dia = [
        new Dialog("you enter the office.", 15, 500, true),
        new Dialog("all the lights are off except for <span class='cmd'>Mr. Brevi</span>'s.", 30, 2000, true),
        new Dialog("", 0, 1000, true),
        new Dialog("you <span class='cmd'>walk</span> toward your cubicle", 15, 1000, true)
    ];
    sendOutput(dia, true, 10000, story_day2a_brevi1_walk); // 10 seconds until defaulting
}

function story_day2a_brevi1_walk() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("Brevi", story_day2a_brevi1_walk_brevi),
        new Command("Mr.", story_day2a_brevi1_walk_brevi, ["brevi"], 1),
        new Command("home", story_day2a_go_home),
    ];
    let dia = [
        new Dialog("you log on to your computer.", 15, 500, true),
        new Dialog("you get a few extra hours in, checking some items off your list of tasks you were planning for next week.", 15, 1000, true),
        new Dialog("", 15, 1000, true),
        new Dialog("the clock says 12:00 pm.", 20, 1000, true),
        new Dialog("you consider taking a visit to <span class='cmd'>Mr. Brevi</span>'s before heading <span class='cmd'>home</span>", 20, 1000, true)
    ];
    sendOutput(dia, true, 10000, story_day2a_go_home); // 10 seconds until defaulting
}

function story_day2a_go_home() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you head home.", 15, 500, true),
       new Dialog("the streets are still empty.", 20, 1000, true),
       new Dialog("", 15, 1000, true),
       new Dialog("isn't it rush hour by now?", 30, 1000, true)
   ];
   sendOutput(dia, true, 5000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("you get home and take the rest of the day off to do some reading.", 15, 500, true),
            new Dialog("", 15, 1000, true),
            new Dialog("you'll call your parents tomorrow morning and let them know you're coming to visit.", 15, 1000, true),
        ];
        sendOutput(dia, true, 5000, ()=>{
            story_day3("a");
        });
   }); // 5 seconds until defaulting
}

function story_day2a_brevi2() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("\"Morning, Mr. Brevi.\"", 15, 500, true),
        new Dialog("", 15, 500, true),
        new Dialog("\"Alex. You shouldn't be here.\"", 60, 500, true),
        new Dialog("", 15, 500, true),
        new Dialog("\"Sir?\"", 30, 1500, true),
        new Dialog("", 15, 500, true),
        new Dialog("\"You shouldn't be here.\"", 100, 1500, true),
    ];
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("\"I'm afraid I don't quite—\"", 15, 500, true),
            new Dialog("", 15, 500, true),
            new Dialog("\"Go home, Alex. Go home.\"", 60, 500, true),
            new Dialog("", 15, 0, true),
            new Dialog("...", 100, 1000, true),
            new Dialog("", 15, 0, true),
            new Dialog("\"What for, sir?\"", 30, 1000, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("\"Go home and see your family.\"", 100, 500, true),
                new Dialog("", 15, 0, true),
                new Dialog("...", 100, 1000, true),
                new Dialog("", 15, 0, true),
                new Dialog("he doesn't speak another word.", 30, 1000, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("...", 100, 50, true),
                    new Dialog("", 15, 1000, true),
                    new Dialog("\"Sir?\"", 60, 1000, true),
                    new Dialog("", 15, 1500, true),
                    new Dialog("he doesn't look at you.", 50, 1500, true),
                    new Dialog("he's holding a photo of his wife who tragically passed away last year from cancer.", 50, 500, true),
                    new Dialog("", 15, 1000, true),
                    new Dialog("his hands are shaking.", 50, 1000, true),
                    new Dialog("his eyes are sheening.", 50, 1000, true),
                ];
                sendOutput(dia, true, 3000, ()=>{
                    stopGameTimer();
                    clearOutput(true);
                    commands = [];
                    dia = [
                        new Dialog("you think Mr. Brevi is having a breakdown because of his loss.", 50, 500, true),
                        new Dialog("knowing how recently his wife passed on, you feel pity for the old man.", 50, 500, true),
                        new Dialog("perhaps the realization finally hit him.", 50, 500, true),
                    ];
                    sendOutput(dia, true, 3000, ()=>{
                        stopGameTimer();
                        clearOutput(true);
                        commands = [];
                        dia = [
                            new Dialog("you spend a few hours getting a head start on the task list you made for next week.", 30, 500, true),
                            new Dialog("", 15, 2000, true),
                            new Dialog("the clock reads 12:00pm.", 15, 1000, true),
                        ];
                        sendOutput(dia, true, 5000, story_day2a_go_home); // 5 seconds until defaulting
                    }); // 3 seconds until defaulting
                }); // 3 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
    }); // 3 seconds until defaulting
}

function story_day2a_brevi1_walk_brevi() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("\"Afternoon, Mr. Brevi.\"", 15, 500, true),
        new Dialog("", 15, 500, true),
        new Dialog("\"Alex. You shouldn't be here.\"", 60, 500, true),
        new Dialog("", 15, 500, true),
        new Dialog("\"Sir?\"", 30, 1500, true),
        new Dialog("", 15, 500, true),
        new Dialog("\"You shouldn't be here.\"", 100, 1500, true),
    ];
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("\"I'm afraid I don't quite—\"", 15, 500, true),
            new Dialog("", 15, 500, true),
            new Dialog("\"Go home, Alex. Go home.\"", 60, 500, true),
            new Dialog("", 15, 0, true),
            new Dialog("...", 100, 1000, true),
            new Dialog("", 15, 0, true),
            new Dialog("\"What for, sir?\"", 30, 1000, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("\"Go home and see your family.\"", 100, 500, true),
                new Dialog("", 15, 0, true),
                new Dialog("...", 100, 1000, true),
                new Dialog("", 15, 0, true),
                new Dialog("he doesn't speak another word.", 50, 1000, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("...", 100, 50, true),
                    new Dialog("", 15, 1000, true),
                    new Dialog("\"Sir?\"", 60, 1000, true),
                    new Dialog("", 15, 1500, true),
                    new Dialog("he doesn't look at you.", 50, 1500, true),
                    new Dialog("he's holding a photo of his wife who tragically passed away last year from cancer.", 50, 500, true),
                    new Dialog("", 15, 1000, true),
                    new Dialog("his hands are shaking.", 50, 1000, true),
                    new Dialog("his eyes are sheening.", 50, 1000, true),
                ];
                sendOutput(dia, true, 5000, story_day2a_go_home); // 5 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
    }); // 3 seconds until defaulting
}

function story_day2a_visit() {
    stopGameTimer();
    clearOutput(true);
    commands = []
    let dia = [
        new Dialog("you drive to your parents' house.", 20, 500, true),
        new Dialog("the interstate is strangely empty.", 20, 1000, true),
        new Dialog("", 20, 1000, true),
        new Dialog("it's gonna take a few hours to get there.", 40, 1000, true),
    ];
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = []
        dia = [
            new Dialog("...", 1000, 500, true),
        ];
        sendOutput(dia, true, 10, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = []
            dia = [
                new Dialog("you make it to your parents' place just past noon.", 20, 500, true),
                new Dialog("", 20, 1000, true),
                new Dialog("it's getting overcast.", 20, 1000, true),
                new Dialog("", 20, 1000, true),
                new Dialog("you ring the doorbell.", 40, 1000, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = []
                dia = [
                    new Dialog("your mother answers the door.", 20, 500, true),
                    new Dialog("she has a strained look on her face.", 40, 1000, true),
                    new Dialog("", 20, 1000, true),
                    new Dialog("you step inside.", 40, 1000, true),
                    new Dialog("", 20, 1000, true),
                    new Dialog("neither of you speak a word.", 80, 1000, true),
                ];
                sendOutput(dia, true, 3000, ()=>{
                    stopGameTimer();
                    clearOutput(true);
                    commands = []
                    dia = [
                        new Dialog("you get settled in for the night.", 20, 500, true),
                        new Dialog("mom and dad ask how work has been.", 20, 1000, true),
                        new Dialog("", 20, 1000, true),
                        new Dialog("you let the odd encounter at the front door slide at dinner.", 40, 1000, true),
                    ];
                    sendOutput(dia, true, 5000, ()=>{
                        story_day3("b");
                    }); // 5 seconds until defaulting
                }); // 3 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 0 seconds until defaulting
    }); // 3 seconds until defaulting
}

function story_day2b() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you wake up a bit late this morning.", 25, 500, true),
        new Dialog("it seems a bit overcast today.", 25, 1000, true),
        new Dialog("you don't hear any birds.", 25, 1000, true),
        new Dialog("", 25, 1000, true),
        new Dialog("you need to finish up on some work from yesterday.", 25, 1000, true),
    ];
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("you drive to work.", 25, 500, true),
            new Dialog("it seems a bit overcast today.", 25, 2000, true),
        ];
        sendOutput(dia, true, 5000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [
                new Command("walk", story_day2b_walk, [], -2),
                new Command("tv", story_day2b_tv, [], -2)
            ];
            dia = [
                new Dialog("you arrive at work.", 25, 500, true),
                new Dialog("as you <span class='cmd'>walk</span> down the hall to your cubicle, \nyou notice that the <span class='cmd'>TV</span> in the lobby is on.", 25, 1000, true),
            ];
            sendOutput(dia, true, 10000, story_day2b_walk); // 10 seconds until defaulting
        }); // 5 seconds until defaulting
    }); // 3 seconds until defaulting
}

function story_day2b_tv() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("\"...NASA confirms the moon is on a direct collision course with the earth...\"", 40, 500, true),
       new Dialog("", 80, 1000, true),
       new Dialog("\"...the administrator reports that the world has less than 36 hours...\"", 60, 500, true),
       new Dialog("", 80, 1000, true),
       new Dialog("\"...scientists are working desperately...\"", 80, 500, true),
   ];
   sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("you saw the moon last night...", 40, 500, true),
            new Dialog("", 80, 1000, true),
            new Dialog("you saw the empty traffic...", 40, 500, true),
            new Dialog("", 80, 1000, true),
            new Dialog("you heard no birds...", 40, 500, true),
            new Dialog("", 80, 1000, true),
            new Dialog("you are shaking.", 80, 500, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("you quickly leave the building and get into your vehicle.", 10, 500, true),
                new Dialog("", 80, 1000, true),
                new Dialog("you frantically drive 20 mph above the limit", 10, 500, true),
                new Dialog("", 80, 1000, true),
                new Dialog("you need to see your parents.", 10, 500, true),
                new Dialog("", 80, 1000, true),
                new Dialog("you are shaking.", 10, 500, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("...", 1000, 500, true),
                ];
                sendOutput(dia, true, 3000, ()=>{
                    stopGameTimer();
                    clearOutput(true);
                    commands = [];
                    dia = [
                        new Dialog("you make it to your parents' house just before noon.", 10, 500, true),
                        new Dialog("", 80, 1000, true),
                        new Dialog("you violently ring the doorbell", 10, 500, true),
                        new Dialog("", 80, 1000, true),
                        new Dialog("...", 1000, 500, true),
                    ];
                    sendOutput(dia, true, 3000, ()=>{
                        stopGameTimer();
                        clearOutput(true);
                        commands = [];
                        dia = [
                            new Dialog("your father answers the door.", 10, 500, true),
                            new Dialog("", 80, 1000, true),
                            new Dialog("you collapse into his arms and begin to sob silently", 20, 500, true),
                            new Dialog("", 80, 1000, true),
                            new Dialog("you remain there for several minutes before heading inside.", 40, 500, true),
                        ];
                        sendOutput(dia, true, 3000, ()=>{
                            stopGameTimer();
                            clearOutput(true);
                            commands = [];
                            dia = [
                                new Dialog("aside from the sound of you and your parents' breathing, the house is dead silent.", 50, 500, true),
                                new Dialog("", 80, 1000, true),
                                new Dialog("even the old grandfather clock has stopped ticking.", 100, 500, true),
                            ];
                            sendOutput(dia, true, 5000, ()=>{
                                story_day3("d");
                            }); // 3 seconds until defaulting
                        }); // 3 seconds until defaulting
                    }); // 3 seconds until defaulting
                }); // 3 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
   }); // 3 seconds until defaulting
}

function story_day2b_walk() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you get seated and finish up on the work you started", 25, 500, true),
       new Dialog("", 25, 500, true),
       new Dialog("...", 1000, 500, true),
   ];
   sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [
            new Command("lunch", story_day2b_walk_lunch, [], -2),
            new Command("head", story_day2b_walk_headstart, ["start"], 1),
        ];
        dia = [
            new Dialog("you check the time and notice it is 1pm.", 25, 500, true),
            new Dialog("the time flew by, didn't it?", 25, 1000, true),
            new Dialog("", 25, 1000, true),
            new Dialog("you could go out for <span class='cmd'>lunch</span>, \nbut you consider getting a <span class='cmd'>head start</span> on next week's work since you're already here.", 25, 1000, true),
        ];
        sendOutput(dia, true, 10000, story_day2b_walk_headstart); // 10 seconds until defaulting
   }); // 10 seconds until defaulting
}

function story_day2b_walk_headstart() {
   stopGameTimer();
   clearOutput(true);
   commands = [
       new Command("investigate", story_day2b_walk_headstart_investigate, ["noise"], 0),
       new Command("don't", story_day2b_walk_headstart_dont, ["bother", "investigate"], 0),
   ];
   let dia = [
       new Dialog("you sit down to work", 25, 500, true),
       new Dialog("", 25, 2000, true),
       new Dialog("BANG", 0, 1000, true),
       new Dialog("", 25, 2000, true),
       new Dialog("whatever that was, it was loud.", 25, 1000, true),
       new Dialog("perhaps you should <span class='cmd'>investigate</span>?", 25, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("nah. <span class='cmd'>don't bother</span>. not you're problem.", 25, 1000, true),
   ];
   sendOutput(dia, true, 5000, story_day2b_walk_headstart_dont); // 10 seconds until defaulting
}

function story_day2b_walk_headstart_dont() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you work for a few more hours before deciding to head home for the night.", 25, 500, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you decide to treat yourself to a good-old DVD movie night.", 25, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("classic.", 25, 500, true),
   ];
   sendOutput(dia, true, 5000, ()=>{
       story_day3("a");
   }); // 5 seconds until defaulting
}

function story_day2b_walk_headstart_investigate() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you walk to where the sound came from.", 25, 500, true),
       new Dialog("it's Mr. Brevi's office.", 25, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("the light is on, but no one's there.", 25, 1000, true),
       new Dialog("", 25, 2000, true),
       new Dialog("then you notice the dead body.", 100, 1000, true),
   ];
   sendOutput(dia, true, 1000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [
            new Command("try", () => {
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("you dial 911 a third time.", 15, 500, true),
                    new Dialog("...", 1000, 1000, true),
                    new Dialog("dead silence meets you.", 25, 1000, true),
                    new Dialog("", 15, 1000, true),
                    new Dialog("you leave before you can vomit.", 25, 2000, true),
                ];
                sendOutput(dia, true, 3000, story_day2b_walk_headstart_investigate_leave); // 3 seconds until defaulting
            }, ["again"], 0),
            new Command("leave", story_day2b_walk_headstart_investigate_leave, [], -2)
        ];
        dia = [
            new Dialog("you dial 911.", 15, 500, true),
            new Dialog("the operator doesn't respond.", 15, 1000, true),
            new Dialog("", 25, 500, true),
            new Dialog("you <span class='cmd'>try again</span>.", 15, 500, true),
            new Dialog("still nothing.", 25, 300, true),
            new Dialog("", 25, 300, true),
            new Dialog("panic begins to build.", 10, 300, true),
            new Dialog("you need to <span class='cmd'>leave</span>.", 50, 1000, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            commands[0].execute();
        }); // 3 seconds until defaulting
   }); // 1 second until defaulting
}

function story_day2b_walk_headstart_investigate_leave() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you quickly leave the building and get into your vehicle.", 25, 500, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you drive home 10 mph above the limit.", 25, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you are haunted by what you saw.", 50, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you hardly notice the lack of traffic.", 80, 1000, true),
   ];
   sendOutput(dia, true, 3000, story_day3_conn); // 3 seconds until defaulting
}

function story_day2b_walk_lunch() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you walk toward the cafeteria just to see if anyone's there.", 25, 500, true),
       new Dialog("", 25, 1000, true),
       new Dialog("it's empty.", 40, 500, true),
   ];
   sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("as you exit the building, you hear something from behind you.", 25, 500, true),
            new Dialog("", 25, 1000, true),
            new Dialog("it sounds like someone dropped something heavy.", 25, 500, true),
            new Dialog("", 25, 1000, true),
            new Dialog("you pay no mind.", 25, 500, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("you pull up to your favorite pizza joint but notice the lights are off.", 25, 500, true),
                new Dialog("", 25, 1000, true),
                new Dialog("there is a sign on the door.", 25, 500, true),
                new Dialog("it reads:", 25, 1000, true),
                new Dialog("", 25, 1000, true),
                new Dialog("GO HOME. CHERISH YOUR LAST DAYS.", 70, 1000, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("you find yourself confused and somewhat disturbed.", 40, 500, true),
                    new Dialog("", 25, 1000, true),
                    new Dialog("you look at the sky and notice that the moon is...", 25, 500, true),
                    new Dialog("", 25, 1000, true),
                    new Dialog("huge.", 100, 1000, true),
                ];
                sendOutput(dia, true, 3000, ()=>{
                    stopGameTimer();
                    clearOutput(true);
                    commands = [];
                    dia = [
                        new Dialog("you swear it wasn't that big last night.", 25, 500, true),
                        new Dialog("", 25, 500, true),
                        new Dialog("did you get enough sleep?", 25, 500, true),
                        new Dialog("where is everyone?", 15, 500, true),
                        new Dialog("what's going on?", 5, 500, true),
                        new Dialog("", 25, 2000, true),
                        new Dialog("you need to get home before you pass out.", 25, 1000, true),
                    ];
                    sendOutput(dia, true, 3000, ()=>{
                        story_day3_conn();
                    }); // 3 seconds until defaulting
                }); // 3 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
   }); // 3 seconds until defaulting
}

function story_day3_conn() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you make it home at 3pm.", 25, 500, true),
       new Dialog("you vomit into your toilet.", 25, 1500, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you can't think.", 80, 500, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you collapse on your bed and pass out.", 25, 500, true),
   ];
   sendOutput(dia, true, 5000, ()=>{
       story_day3("c");
   }); // 10 seconds until defaulting
}

function story_day3(path) {
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape fix to prevent access to debug screen mid-countdown
    commands = [];
    let clock = ["t-24:00:00", "t-23:00:59", "t-23:00:58", "t-23:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        clearOutput(true);
        startGameTimer(4000, () => {inputEnabled = true;});
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            inputEnabled = true;
            if (path == "a") {
                setTimeout(story_day3a, 1000);
            }
            else if (path == "b") {
                setTimeout(story_day3b, 1000);
            }
            else if (path == "c") {
                setTimeout(story_day3c, 1000);
            }
            else {
                setTimeout(story_day3d, 1000);
            }
        }
    }, 1000);
}

function story_day3a() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you wake up.", 25, 500, true),
       new Dialog("you look out your window and notice it's still dark.", 25, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you turn to flick on the light but it doesn't turn on.", 25, 1000, true),
       new Dialog("that's odd.", 25, 1000, true),
       new Dialog("it looks like there's been a blackout.", 25, 1000, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you grab your phone and turn it on", 25, 500, true),
   ];
   sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("the clock reads: 10:45am", 25, 500, true),
            new Dialog("...10:45?", 25, 2000, true),
            new Dialog("", 25, 1000, true),
            new Dialog("why's it so dark outside?", 25, 500, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("you go to turn on the TV out of habit and remember that the power's out.", 25, 500, true),
                new Dialog("", 25, 1000, true),
                new Dialog("you call your parents instead.", 25, 500, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("...", 1000, 500, true),
                    new Dialog("...", 1000, 500, true),
                    new Dialog("...", 1000, 500, true),
                    new Dialog("there's no signal.", 25, 1000, true),
                    new Dialog("you didn't even get to their voicemail.", 25, 1000, true),
                    new Dialog("you hope they're doing alright.", 25, 1000, true),
                ];
                sendOutput(dia, true, 3000, ()=>{
                    stopGameTimer();
                    clearOutput(true);
                    commands = [];
                    dia = [
                        new Dialog("you eat your cereal dry this morning and treat yourself to the fruit basket.", 25, 1000, true),
                        new Dialog("", 10, 1000, true),
                        new Dialog("you don't trust how long the milk's gone unrefrigerated.", 25, 1000, true),
                    ];
                    sendOutput(dia, true, 3000, ()=>{
                        stopGameTimer();
                        clearOutput(true);
                        commands = [];
                        dia = [
                            new Dialog("you try to boot up your laptop but remember that you were supposed to charge it yesterday but forgot.", 25, 1000, true),
                            new Dialog("", 10, 1000, true),
                            new Dialog("you take out your phone instead to pass the time.", 25, 1000, true),
                        ];
                        sendOutput(dia, true, 3000, ()=>{
                            inputEnabled = false; // duct tape fix to prevent access to debug screen mid-countdown
                            commands = [];
                            let clock = ["t-10:00:00", "t-09:00:59", "t-09:00:58", "t-09:00:57", ""]
                            let i = 0;
                            const inter = setInterval(()=>{
                                clearOutput(true);
                                startGameTimer(4000, () => {inputEnabled = true;});
                                sendOutput([new Dialog(clock[i], 0, 0, true)]);
                                ++i;
                                if (i >= clock.length) {
                                    clearOutput(true);
                                    clearInterval(inter);
                                    inputEnabled = true;
                                    stopGameTimer();
                                    commands = [
                                        new Command("hours", story_day3a_hours, [], -2),
                                        new Command("drowsy", story_day3a_drowsy, [], -2),
                                        new Command("sleep", story_day3a_drowsy, [], -2),
                                    ];
                                    dia = [
                                        new Dialog("you got bored of Angry Birds and Geometry Dash after a few hours.", 25, 500, true),
                                        new Dialog("", 25, 1000, true),
                                        new Dialog("you still have a few <span class='cmd'>hours</span> of battery left, but you're feeling a bit <span class='cmd'>drowsy</span>.", 25, 500, true),
                                        new Dialog("it is still dark out, after all.", 50, 1500, true),
                                        new Dialog("somehow.", 50, 1500, true),
                                    ];
                                    sendOutput(dia, true, 3000, story_day3a_drowsy);
                                }
                            }, 1000);
                        }); // 3 seconds until defaulting
                    }); // 3 seconds until defaulting
                }); // 3 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
   }); // 3 seconds until defaulting
}

function story_day3a_hours() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("you lay in bed with your headphones and play a playlist you had saved.", 25, 500, true),
       new Dialog("", 25, 1000, true),
       new Dialog("you close your eyes and drift asleep.", 50, 1000, true),
   ];
   sendOutput(dia, true, 5000, story_day3a_ending); // 5 seconds until defaulting
}

function story_day3a_drowsy() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you decide to head to bed.", 25, 500, true),
        new Dialog("it's a bit hot.", 25, 1500, true),
        new Dialog("then again, the AC hasn't been running for a while.", 25, 1500, true),
        new Dialog("", 25, 1000, true),
        new Dialog("you take some sleeping medication and lay in bed nearly naked.", 25, 500, true),
        new Dialog("", 25, 1000, true),
        new Dialog("you close your eyes and drift asleep.", 50, 1000, true),
    ];
    sendOutput(dia, true, 5000, story_day3a_ending); // 5 seconds until defaulting
}

function story_day3a_ending() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
       new Dialog("...", 1000, 500, true)
   ];
   sendOutput(dia, true, 3000, ()=>{
       clearOutput(true);
       setTimeout(()=>{
            story_end(1);
       }, 1000);
    }); // 3 seconds until defaulting
}

function story_day3b() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you woke up this morning to find your parents listening to their old radio.", 35, 500, true),
        new Dialog("", 25, 1000, true),
        new Dialog("voices pierce through the static...", 45, 500, true),
    ];
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("\"̴M̶y̵ ̸b̴r̷o̵t̴h̷e̸r̷s̵ ̷a̷n̸d̶ ̸s̴i̶s̴t̶e̸r̵s̸,̷", 35, 500, true),
            new Dialog("d̸o̸ ̸n̶o̵t̸ ̷b̶e̷ ̴a̶f̶r̴a̸i̸d̴,̷", 35, 1000, true),
            new Dialog("\̵f̴o̸r̶ ̸t̷h̶i̵s̶ ̸i̷s̷ ̶n̷o̷t̷ ̸t̴h̴e̵ ̴e̴n̸d̴,̷", 35, 1000, true),
            new Dialog("b̶u̴t̴ ̴a̶ ̸n̶e̷w̶ ̷b̸e̵g̴i̴n̶n̸i̷n̷g̴.̶", 35, 1000, true),
            new Dialog("", 25, 1000, true),
            new Dialog("M̸a̷y̷ ̵w̷e̴ ̴m̴e̸e̸t̵ ̶a̶g̸a̶i̴n̸ ̴i̴n̴ ̴p̸a̶r̴a̸d̶i̴s̶e̷.̴\"̷", 45, 500, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("\"̷.̸.̴.̴w̶i̵t̷n̵e̸s̶s̶e̶s̸ ̸r̵e̴p̷o̷r̷t̸ ̵t̵h̶o̷u̵s̶a̴n̷d̴s̴ ̶o̴f̵ ̶f̸l̸a̴r̴e̵s̷ ̶b̸u̵r̷n̸i̷n̷g̷ ̶a̵c̵r̶o̷s̷s̴ ̶t̵h̶e̴ ̷s̵k̵y̸.̶.̷.̶\"̸", 15, 500, true),
                new Dialog("", 15, 0, true),
                new Dialog("̶\"̵.̷.̷.̷L̶o̶r̵d̵,̶ ̴h̸a̷v̵e̴ ̴m̷e̶r̴c̸y̶ ̶o̴n̵ ̵u̵s̴!̴.̶.̷.̴\"̴", 15, 500, true),
                new Dialog("", 15, 0, true),
                new Dialog("̶\"̴.̷.̴.̶w̵e̶ ̵h̶a̶v̷e̷ ̸r̴e̷c̸e̸i̵v̷e̶d̵ ̶r̷e̸p̴o̶r̴t̷s̸ ̵o̷f̸ ̷s̸p̸o̸n̷t̸a̸n̸e̴o̸u̷s̴ ̵e̸a̸r̸t̵h̶q̴u̵a̷k̶e̴s̵ ̸a̴n̶d̶ ̴e̴x̶t̵r̶e̴m̴e̶l̸y̴ ̵l̵o̶u̴d̶ ̴n̴o̷i̶s̴e̷s̷ ̶r̷e̶v̵e̵r̵b̷e̸r̶a̵t̴i̸n̵g̶ ̷i̸n̵ ̷t̴h̷e̵ ̷a̶t̷m̶o̵s̸p̷h̵e̴r̵e̷.̴.̷.̴\"̸", 15, 500, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("\".̶.̶.̸N̷A̵S̶A̵ ̷h̵a̴s̴ ̶b̷e̴e̸n̴ ̷u̸n̴a̶b̶l̷e̶ ̶t̷o̸ ̶f̸i̸n̵d̴ ̸a̶ ̵w̸a̶y̸ ̶t̴o̸ ̴d̸e̵f̵l̶e̶c̷t̶ ̷t̷h̴e̷ ̴t̴r̶a̷j̸e̶c̴t̵o̷r̵y̴ ̶o̴f̸ ̶t̸h̷e̵ ̷m̷o̶o̵n̴.̸.̴.̵\"", 15, 500, true),
                    new Dialog("", 15, 0, true),
                    new Dialog(".̷.̵.̸t̸h̶e̸ ̵U̴n̷i̷t̵e̶d̴ ̵N̴a̶t̷i̷o̸n̷s̵ ̵h̷a̶s̸ ̷d̶e̷c̴l̶a̸r̸e̸d̵ ̶a̷ ̷g̵l̴o̴b̴a̴l̴ ̵s̶t̵a̸t̵e̸ ̶o̸f̵ ̶e̴m̵e̸r̸g̶e̷n̴c̶y̶,̸ ̵c̸o̵d̷e̸n̵a̶m̵e̴ ̶'̷J̴u̸d̴g̴e̶m̵e̷n̶t̸ ̷D̸a̷y̸'̴.̴.̵.̵", 15, 500, true),
                    new Dialog("", 15, 0, true),
                    new Dialog(".̶.̸.̴d̵o̷z̴e̸n̷s̵ ̷o̷f̵ ̸i̸s̷l̴a̸n̷d̷s̷ ̷a̸n̴d̸ ̸c̸o̵a̵s̶t̴s̴ ̸h̸a̵v̶e̵ ̸b̶e̶e̴n̶ ̷c̶o̸m̵p̷l̵e̷t̶e̴l̸y̷ ̸w̷i̸p̶e̶d̵ ̷o̸u̵t̸ ̶b̵y̶ ̷t̵h̴e̸ ̶a̸m̷p̴l̸i̸f̸i̵e̵d̷ ̴w̴a̶v̵e̴s̴.̵.̶.̸", 15, 500, true),
                ];
                sendOutput(dia, true, 3000, ()=>{
                    stopGameTimer();
                    clearOutput(true);
                    commands = [];
                    dia = [
                        new Dialog("the power suddenly shuts off.", 35, 500, true),
                        new Dialog("you notice how dark it is outside.", 35, 1500, true),
                        new Dialog("", 15, 1000, true),
                        new Dialog("your bedroom clock said it was 11am when you left the room.", 35, 500, true),
                        new Dialog("", 15, 1000, true),
                        new Dialog("you feel moisture down your cheek", 35, 500, true),
                    ];
                    sendOutput(dia, true, 3000, ()=>{
                        stopGameTimer();
                        clearOutput(true);
                        commands = [];
                        dia = [
                            new Dialog("you realize how badly you were shaking when your father pulls you and your mother into an embrace.", 45, 500, true),
                            new Dialog("", 15, 2000, true),
                            new Dialog("you look at the old grandfather clock.", 65, 500, true),
                            new Dialog("", 15, 1000, true),
                            new Dialog("it reads: ", 35, 1500, true),
                            new Dialog("", 15, 1000, true),
                            new Dialog("8:55pm", 35, 1500, true),
                        ];
                        sendOutput(dia, true, 3000, ()=>{
                            stopGameTimer();
                            clearOutput(true);
                            commands = [];
                            dia = [
                                new Dialog("...", 1000, 500, true),
                                new Dialog("you don't dare move from your parents' embrace.", 85, 2000, true),
                            ];
                            sendOutput(dia, true, 3000, ()=>{
                                stopGameTimer();
                                clearOutput(true);
                                commands = [];
                                dia = [
                                    new Dialog("...", 1000, 500, true),
                                    new Dialog("a low rumbling is growing.", 35, 2000, true),
                                    new Dialog("it falls upon deaf ears.", 35, 2000, true),
                                    new Dialog("...", 1000, 2000, true),
                                    new Dialog("you can see the red moon swallowing the horizon...", 35, 2000, true),
                                    new Dialog("it's getting brighter outside...", 85, 2000, true),
                                ];
                                sendOutput(dia, true, 3000, ()=>{
                                    stopGameTimer();
                                    clearOutput(true);
                                    commands = [];
                                    dia = [
                                        new Dialog("you can't help but", 100, 2500, true),
                                        new Dialog("shed a", 100, 1, true),
                                        new Dialog("tear", 100, 1, true),
                                    ];
                                    sendOutput(dia, true, 5000, ()=>{
                                        story_day3b_ending();
                                    }); // 5 seconds until defaulting
                                }); // 3 seconds until defaulting
                            }); // 3 seconds until defaulting
                        }); // 3 seconds until defaulting
                    }); // 3 seconds until defaulting
                }); // 3 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
    }); // 3 seconds until defaulting
 }

 function story_day3b_ending() {
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape fix to prevent access to debug screen mid-countdown
    let clock = ["t-", "00", ":", "00", ":", "05"];
    let second = 5;
    commands = [];
     let dia = [
         new Dialog("t-00:00:05", 0, 1000, true)
     ];
     sendOutput(dia, false);
     setTimeout(()=>{
        const clockDiv = output.childNodes[0];
         gameTimer = setInterval(()=>{
             if (second == 0) {
                 clearInterval(gameTimer);
                 story_end(2);
             }
             else {
                --second;
                clock[5] = second.toLocaleString("en-US", {
                    minimumIntegerDigits: 2,
                    useGrouping: false
                });
                clockDiv.innerHTML = clock.join("");
             }
         }, 1000);
     }, 1000);
 }

 function story_day3c() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("phone", story_day3c_phone, [], -2),
        new Command("take", story_day3c_phone, ["phone"], 1),
    ];
    let dia = [
        new Dialog("you wake up with a splitting headache.", 60, 500, true),
        new Dialog("it's still dark out.", 60, 1500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you look at your clock but it's off.", 60, 1500, true),
        new Dialog("the power's out.", 60, 1000, true),
        new Dialog("", 60, 1500, true),
        new Dialog("your <span class='cmd'>phone</span> is next to your clock.", 60, 1500, true),
    ];
    sendOutput(dia, true, 8000, story_day3c_roll); // 8 seconds until defaulting
 }

 function story_day3c_phone() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you check your phone and jolt when you see that it reads:", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("11:30 am", 70, 1500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("a bead of sweat rolls down your face.", 80, 1000, true),
    ];
    sendOutput(dia, true, 5000, story_day3c_roll); // 5 seconds until defaulting
 }

 function story_day3c_roll() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("feel", story_day3c_roll_terrible, ["terrible"], 1),
        new Command("terrible", story_day3c_roll_terrible, [""], -2),
    ];
    let dia = [
        new Dialog("you slowly roll out of bed and head to the kitchen.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you <span class='cmd'>feel terrible</span>", 100, 1500, true),
    ];
    sendOutput(dia, true, 5000, story_day3c_roll_terrible); // 5 seconds until defaulting
 }

 function story_day3c_roll_terrible() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("reach", story_day3c_pill1, ["medication", "pills"], 0),
        new Command("anxiety", story_day3c_pill1, ["medication", "pills"], 0),
        new Command("medication", story_day3c_pill1, [], -2),
    ];
    let dia = [
        new Dialog("you start shaking again.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you <span class='cmd'>reach</span> for your <span class='cmd'>anxiety medication</span>", 60, 1500, true),
    ];
    sendOutput(dia, true, 5000, story_day3c_pill1); // 5 seconds until defaulting
 }

 function story_day3c_pill1() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("feel", story_day3c_pill1_guilt, ["guilt", "guilty"], 1),
        new Command("guilty", story_day3c_pill1_guilt, -2),
        new Command("pill", story_day3c_pill2, [], -2),
        new Command("take", story_day3c_pill2, ["another", "pill"], 1),
        new Command("swallow", story_day3c_pill2, ["another", "pill"], 1),
        new Command("another", story_day3c_pill2, ["pill"], 1),
    ];
    let dia = [
        new Dialog("you swallow a <span class='cmd'>pill</span>.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you think about all the things you didn't get done.", 60, 500, true),
        new Dialog("all the things you didn't get to do.", 60, 1000, true),
        new Dialog("all the people you didn't get to reach out to.", 60, 1000, true),
        new Dialog("all the relationships you failed to keep.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you <span class='cmd'>feel guilty</span>", 80, 1500, true),
    ];
    sendOutput(dia, true, 5000, story_day3c_pill2); // 5 seconds until defaulting
 }

 function story_day3c_pill2() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("feel", story_day3c_pill3, ["horrible"], 1),
        new Command("horrible", story_day3c_pill3, -2),
        new Command("pill", story_day3c_pill3, [], -2),
        new Command("take", story_day3c_pill3, ["another", "pill"], 1),
        new Command("swallow", story_day3c_pill3, ["another", "pill"], 1),
        new Command("another", story_day3c_pill3, ["pill"], 1),
    ];
    let dia = [
        new Dialog("you swallow <span class='cmd'>another pill</span>.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you think about your parents and \nhow long it's been since you last saw them.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you <span class='cmd'>feel horrible</span> for not visiting them", 80, 1500, true),
    ];
    sendOutput(dia, true, 5000, story_day3c_pill3); // 4 seconds until defaulting
 }

 function story_day3c_pill3() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("pill", story_day3c_pill3_ending, [], -2),
        new Command("take", story_day3c_pill3_ending, ["another", "pill"], 1),
        new Command("swallow", story_day3c_pill3_ending, ["another", "pill"], 1),
        new Command("another", story_day3c_pill3_ending, ["pill"], 1),
    ];
    let dia = [
        new Dialog("you swallow <span class='cmd'>another pill</span>.", 80, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you feel like a failure.", 80, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you failed your friends", 80, 1000, true),
        new Dialog("you failed your family", 80, 1000, true),
        new Dialog("you failed your dreams", 80, 1000, true),
        new Dialog("", 60, 1000, true),
        new Dialog("", 60, 1000, true),
        new Dialog("your head starts to spin.", 100, 1000, true),
    ];
    sendOutput(dia, true, 3000, story_day3c_pill3_ending); // 3 seconds until defaulting
 }

 function story_day3c_pill3_ending() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you lose consciousness.", 100, 3000, true),
    ];
    sendOutput(dia, true, 5000, ()=>{
        stopGameTimer();
        clearOutput(true);
        setTimeout(()=>{
            story_end(3);
        }, 5000);
    }); // 5 seconds until defaulting
 }

 function story_day3c_pill1_guilt() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you walk back to your room in a daze.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("you think about your parents and how long it's been since you last saw them.", 60, 500, true),
        new Dialog("", 60, 1500, true),
        new Dialog("is this a nightmare?", 60, 1500, true),
    ];
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("you pick up the hunting rifle your dad gave you so many birthdays ago.", 60, 500, true),
            new Dialog("", 60, 1500, true),
            new Dialog("you feel like everything you did was for nothing.", 60, 500, true),
            new Dialog("where did you end up in life?", 60, 1500, true),
            new Dialog("you're a failure", 60, 1500, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("you step out back on the porch and glance at the sky.", 40, 500, true),
                new Dialog("all of your hopes and dreams, gone.", 40, 1500, true),
                new Dialog("all of your time, utterly wasted.", 40, 1000, true),
                new Dialog("", 60, 1500, true),
                new Dialog("you're a failure.", 15, 1000, true),
                new Dialog("you're a failure.", 15, 1000, true),
                new Dialog("you're a failure.", 15, 1000, true),
                new Dialog("you're a failure.", 15, 1000, true),
            ];
            sendOutput(dia, true, 3000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [
                    new Command("stare", story_day3c_pill1_guilt_stare, [], -2),
                    new Command("rifle", story_day3c_pill1_guilt_rifle, [], -2),
                    new Command("load", story_day3c_pill1_guilt_rifle, ["rifle"], 1),
                ];
                dia = [
                    new Dialog("you sit on the bench.", 30, 500, true),
                    new Dialog("you <span class='cmd'>stare</span> off toward the blood moon", 30, 1500, true),
                    new Dialog("as it visibly draws closer to the earth", 30, 0, true),
                    new Dialog("your ear drums rattle.", 30, 1000, true),
                    new Dialog("", 60, 1500, true),
                    new Dialog("you put the <span class='cmd'>rifle</span> on your lap", 30, 1000, true),
                ];
                sendOutput(dia, true, 4000, ()=>{
                    story_day3c_pill1_guilt_stare();
                }); // 4 seconds until defaulting
            }); // 3 seconds until defaulting
        }); // 3 seconds until defaulting
    }); // 3 seconds until defaulting
 }

 function story_day3c_pill1_guilt_stare() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you're paralyzed.", 20, 500, true),
        new Dialog("the light burns brighter.", 20, 1000, true),
        new Dialog("the very earth is roaring.", 20, 500, true),
        new Dialog("", 20, 1500, true),
        new Dialog("your skin is melting.", 80, 500, true),
    ];
    sendOutput(dia, true, 3000, story_day3c_pill1_paralyzed_ending); // 5 seconds until defaulting
 }

function story_day3c_pill1_guilt_rifle() {
   stopGameTimer();
   clearOutput(true);
   commands = [
       new Command("lift", story_day3c_pill1_guilt_rifle_lift, ["rifle"], 1),
       new Command("rifle", story_day3c_pill1_guilt_rifle_lift, [], -2),
   ];
   let dia = [
        new Dialog("you shakily chamber a round.", 80, 500, true),
        new Dialog("", 20, 1000, true),
        new Dialog("the heat is growing unbearable.", 20, 1000, true),
        new Dialog("", 20, 1000, true),
        new Dialog("the earth is ablaze.", 20, 1000, true),
        new Dialog("", 20, 1000, true),
        new Dialog("you lift up the rifle", 80, 1000, true),
   ];
   sendOutput(dia, true, 3000, story_day3c_pill1_paralyzed_ending); // 3 seconds until defaulting
}

function story_day3c_pill1_guilt_rifle_lift() {
   stopGameTimer();
   clearOutput(true);
   commands = [];
   let dia = [
    new Dialog("...", 1000, 500, true),
    new Dialog("...", 1000, 500, true),
    new Dialog("even in your final moments,", 50, 3000, true),
    new Dialog("you can't bring yourself to do it.", 50, 0, true),
    new Dialog("", 20, 1000, true),
    new Dialog("even in your final moments,", 70, 1000, true),
    new Dialog("", 20, 0, true),
    new Dialog("", 20, 1000, true),
    new Dialog("you're a coward.", 100, 1000, true),
   ];
   sendOutput(dia, true, 3000, story_day3c_pill1_paralyzed_ending); // 10 seconds until defaulting
}

 function story_day3c_pill1_paralyzed_ending() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you can't help but scream.", 100, 3000, true)
    ];
    sendOutput(dia, true, 10000, ()=>{
        stopGameTimer();
        clearOutput(true);
        setTimeout(()=>{
            story_end(4);
        }, 5000);
    }); // 10 seconds until defaulting
 }

 function story_day3d() {
    stopGameTimer();
    clearOutput(true);
    let checkedLivingRoom = false;
    let checkedBedroom = false;
    let checkedKitchen = false;

    commands = [
        new Command("living", ()=>{
            if (checkedLivingRoom) {
                sendOutput([new Dialog("you already looked in the living room", 25, 0, false)], false);
            }
            else {
                stopGameTimer();
                checkedLivingRoom = true;
                let livDia = [
                    new Dialog("you see a note on the coffee table:", 25, 0, true),
                    new Dialog("\"come outside when you're ready. bring a bottle if you'd like.\"", 25, 500, true),
                ];
                const timeLeft = (checkedBedroom && checkedKitchen && checkedLivingRoom) ? 3000 : 10000;
                sendOutput(livDia, true, timeLeft, () => {
                    story_day3d_outside(checkedKitchen)
                });
            }
        }, ["room"], 1),
        new Command("bedroom", ()=>{
            if (checkedLivingRoom) {
                sendOutput([new Dialog("you know they're outside.", 25, 0, false)], false);
            }
            else if (checkedBedroom) {
                sendOutput([new Dialog("you already looked in their bedroom", 25, 0, false)], false);
            }
            else {
                stopGameTimer();
                checkedBedroom = true;
                let bedDia = [
                    new Dialog("you don't see any sign of them in their bedroom.", 25, 0, true),
                ];
                const timeLeft = (checkedBedroom && checkedKitchen && checkedLivingRoom) ? 3000 : 10000;
                sendOutput(bedDia, true, timeLeft, () => {
                    story_day3d_outside(checkedKitchen)
                });
            }
        }, [], -2),
        new Command("kitchen", ()=>{
            if (checkedKitchen) {
                sendOutput([new Dialog("you already looked in the kitchen", 25, 500, false)], false);
            }
            else {
                stopGameTimer();
                checkedKitchen = true;
                let kitDia = [
                    new Dialog("you notice the liquor cabinet is open.", 25, 500, true),
                    new Dialog("you grab a bottle from the cabinet.", 25, 500, true),
                ];
                const timeLeft = (checkedBedroom && checkedKitchen && checkedLivingRoom) ? 3000 : 10000;
                sendOutput(kitDia, true, timeLeft, () => {
                    story_day3d_outside(checkedKitchen)
                });
            }
        }, [], -2),
    ];
    let dia = [
        new Dialog("you wake up to find your parents missing.", 25, 500, true),
        new Dialog("", 25, 500, true),
        new Dialog("you don't see them in the <span class='cmd'>living room</span>, and they aren't in their <span class='cmd'>bedroom</span>.", 25, 500, true),
        new Dialog("the <span class='cmd'>kitchen</span> sounds empty.", 25, 500, true),
    ];
    sendOutput(dia, true, 10000, story_day3d_outside); // 10 seconds until defaulting
 }

 function story_day3d_outside(hasLiquor=false) {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("you step outside and see your parents \nsoftly chatting on the bench.", 25, 500, true),
        new Dialog("", 25, 1000, true),
    ];
    if (hasLiquor) {
        dia = dia.concat([
            new Dialog("you join them and pass the bottle after a long swig.", 25, 500, true),
        ]);
    }
    else {
        dia = dia.concat([
            new Dialog("you join them.", 25, 500, true),
            new Dialog("", 25, 0, true),
            new Dialog("you notice an empty bottle on the ground.", 25, 1000, true),
        ]);
    }
    sendOutput(dia, true, 3000, ()=>{
        stopGameTimer();
        clearOutput(true);
        commands = [];
        dia = [
            new Dialog("you start to reminisce about your childhood.", 25, 500, true),
            new Dialog("how lucky you were to have the parents you have \neven as you graduated and entered adulthood alone and afraid.", 25, 1000, true),
            new Dialog("", 25, 0, true),
            new Dialog("how lucky you are to have their presence now.", 25, 1000, true),
        ];
        sendOutput(dia, true, 3000, ()=>{
            stopGameTimer();
            clearOutput(true);
            commands = [];
            dia = [
                new Dialog("even now, as the blood moon \nfalls from the sky and lights the world aflame,", 25, 500, true),
                new Dialog("you don't mind.", 25, 1000, true),
                new Dialog("", 25, 0, true),
                new Dialog("all those things you didn't get to do,", 25, 1000, true),
                new Dialog("all those relationships that didn't work out...", 25, 1000, true),
                new Dialog("", 25, 1000, true),
                new Dialog("they don't bother you anymore.", 25, 1000, true),
            ];
            sendOutput(dia, true, 5000, ()=>{
                stopGameTimer();
                clearOutput(true);
                commands = [];
                dia = [
                    new Dialog("you have them.", 50, 500, true),
                    new Dialog("", 25, 1000, true),
                    new Dialog("they have you.", 60, 500, true),
                    new Dialog("", 25, 1000, true),
                    new Dialog("", 25, 1000, true),
                    new Dialog("you're at peace.", 70, 1000, true),
                ];
                sendOutput(dia, true, 5000, ()=>{
                    story_day3d_ending()
                }); // 10 seconds until defaulting
            }); // 10 seconds until defaulting
        }); // 10 seconds until defaulting
    }); // 10 seconds until defaulting
 }

 function story_day3d_ending() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("...", 1000, 500, true)
    ];
    sendOutput(dia, true, 3000, ()=>{
        clearOutput(true);
        setTimeout(()=>{
                story_end(5);
        }, 3000);
    }); // 3 seconds until defaulting
 }

 /**
  * Final game scene
  * @param {int} ending     See endings array for list of possible endings
  */
 function story_end(ending=0) {
    const endingIndex = Math.min(Math.max(Math.floor(ending), 0), endings.length - 1);
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape fix to prevent access to debug screen mid-countdown
    let clock = ["t+", "00", ":", "00", ":", "00"];
    let hour = 0;
    let minute = 0;
    let second = 0;
    commands = [
        new Command("restart", start, [], -2) 
     ];
     let dia = [
         new Dialog("t-00:00:00", 0, 0, true),
         new Dialog("", 25, 0, true),
         new Dialog("", 25, 0, true),
         new Dialog("", 25, 0, true),
         new Dialog("ultimo", 0, 3000, true),
     ];
     sendOutput(dia, true, 1000, ()=>{
         const clockDiv = output.childNodes[0];
         dia = [
             new Dialog("", 25, 0, true),
             new Dialog("created by donald nelson", 0, 0, true),
             new Dialog("", 0, 0, true),
             new Dialog("", 0, 0, true),
             new Dialog(`<span class='hint'>ending ${endingIndex}/${endings.length - 1}: ${endings[endingIndex]}</span>`, 100, 2000, true),
             new Dialog("", 0, 0, true),
             new Dialog("", 0, 0, true),
             new Dialog("", 0, 0, true),
             new Dialog("", 0, 0, true),
             new Dialog("type <span class='cmd'>restart</span> and hit enter", 50, 2000, true),
         ];
         sendOutput(dia, false);
         gameTimer = setInterval(()=>{
             ++second;
             minute += Math.floor(second/60);
             second %= 60;
             hour += Math.floor(minute/60);
             minute %= 60;
             clock[1] = hour.toLocaleString("en-US", {
                 minimumIntegerDigits: 2,
                 useGrouping: false
             });
             clock[3] = minute.toLocaleString("en-US", {
                 minimumIntegerDigits: 2,
                 useGrouping: false
             });
             clock[5] = second.toLocaleString("en-US", {
                 minimumIntegerDigits: 2,
                 useGrouping: false
             });
             clockDiv.innerHTML = clock.join("");
         }, 1000);
     });
 }

const endings = [
    "dust",         // dev debug, not a real ending
    "ignorance",    // default ending
    "despair",      // crying with family
    "overdose",     // too many pills
    "inferno",      // not enough pills
    "acceptance",   // reflecting with family
]

const gameScenes = [
    start, 
    story_day1,
    story_day1_a, story_day1_murmurs, story_day1_something, story_day1_somethingb, story_day1_work, 
    story_day2, 
    story_day2a, story_day2a_work, story_day2a_brevi1, story_day2a_go_home, story_day2a_brevi1_walk, story_day2a_brevi2, story_day2a_brevi1_walk_brevi, story_day2a_visit, 
    story_day2b,
    story_day2b_walk, story_day2b_tv, story_day2b_walk_headstart, story_day2b_walk_headstart_dont,
    story_day2b_walk_headstart_investigate, story_day2b_walk_headstart_investigate_leave,
    story_day2b_walk_lunch,
    story_day3_conn,
    story_day3,
    story_day3a, story_day3a_hours, story_day3a_drowsy, story_day3a_ending,
    story_day3b, story_day3b_ending,
    story_day3c, story_day3c_phone, story_day3c_roll, story_day3c_roll_terrible, story_day3c_pill1,
    story_day3c_pill2, story_day3c_pill3, story_day3c_pill3_ending,
    story_day3c_pill1_guilt, story_day3c_pill1_guilt_stare,
    story_day3c_pill1_guilt_rifle, story_day3c_pill1_guilt_rifle_lift,
    story_day3c_pill1_paralyzed_ending,
    story_day3d, story_day3d_outside, story_day3d_ending,
    story_end
];

start();
