const output = document.querySelector("#output")
const input = document.querySelector("#cmd")
let intervals = []

const str_test = [
    "Hello.",
    "This is a test of the string print output.",
    "I'm not sure how well this will work",
    "<b>Let's find out.</b>"
]

class Dialog {
    constructor(text="", delay=0, interval=0) {
        this.text = text;
        this.delay = delay;
        this.interval = interval;
    }
}

const dialog_test = [
    new Dialog("Hello.", 100),
    new Dialog("This is a test of the string print output.", 50, 1000),
    new Dialog("I'm not sure how well this will work", 20, 500),
    new Dialog("<b>Let's find out.</b>", 200, 1500)
]

function clearOutput() {
    const outDivs = output.childNodes;
    for (let i = outDivs.length - 1; i >= 0; i--) {
        output.removeChild(outDivs[i])
    }

    for (let i = intervals.length - 1; i >= 0; i--) {
        clearInterval(intervals[i]);
        intervals.pop()
    }
}

function start() {
    const dialog_start = [
        new Dialog("ultimo\n\n\n\n\n", 100),
        new Dialog(""),
        new Dialog(""),
        new Dialog(""),
        new Dialog(""),
        new Dialog(""),
        new Dialog("<u>start</u> day", 100, 1000)
    ];
    
    sendOutput(dialog_start);

}

// function sendOutput(dialogArr) {
//     let divs = [];
//     for (let i = 0; i < dialogArr.length; i++) {
//         div = document.createElement("div");
//         output.appendChild(div);
//         divs.push(div);
//     }
//     let line = 0;
//     const listener = output.addEventListener("lineDone", ()=>{
//         line++;
//         if (line < dialogArr.length) {
//             setTimeout(()=>{
//                 console.log(line);
//                 typewriter(dialogArr[line].delay, divs[line], dialogArr[line].text);
//             }, dialogArr[line].interval);
//         }
//         else {
//             output.removeEventListener("lineDone", listener);
//         }
//     });
//     typewriter(dialogArr[line].delay, divs[line], dialogArr[line].text);
// }

function sendOutput(dialogArr) {
    let divs = [];
    for (let i = 0; i < dialogArr.length; i++) {
        div = document.createElement("div");
        output.appendChild(div);
        divs.push(div);
    }
    typewriters(dialogArr, divs, 0);
    // let line = 0;
    // console.log(typewriter(dialogArr[line].delay, divs[line], dialogArr[line].text));
    // recursivePrint(dialogArr, divs, line);
}

// function recursivePrint(diagArr, divs, line) {
//     const p = typewriter(dialogArr[line].delay, divs[line], dialogArr[line].text);
//     p.then((message)=>{
//         console.log("recursion line");
//         ++line;
//         if (line < diagArr.length) {
//             return true;
//         }
//         else {
//             const p2 = new Promise((resolve, reject) => {
//                 setTimeout(()=>{
//                     if (recursivePrint(diagArr, divs, line)) resolve("recursion done");
//                 }, diagArr[line].interval);
//             });
//             p2.then(()=>{
//                 return true;
//             })
//         }
//     });
// }


function echoInput(inputStr) {
    const echo = [
        new Dialog("<echo>> " + inputStr + "</echo>", 0, 0),
        new Dialog("<err>command not found</err>", 0, 0)
    ]
    sendOutput(echo);
}


// adopted from https://stackoverflow.com/questions/29462305/how-to-create-a-typewriter-effect-in-javascript-that-will-take-into-account-html/29462670
function typewriter(delay, div, str) {
    let i = 0;
    let timer = setInterval(() => {
        const char = str[i];
        if (char === "<") {
            i = str.indexOf(">", i); // skip to end of tag
        }

        div.innerHTML = str.slice(0, i+1);

        if (++i >= str.length) {
            clearInterval(timer);
            console.log('done');
            const e = new CustomEvent('lineDone');
            output.dispatchEvent(e);
        }
    }, delay);
    intervals.push(timer);
}

function forceOut(div, str) {
    div.innerHTML = str;
}

// function typewriter(delay, div, str) {
//     let i = 0;
//     let spot = intervals.length;
//     const p = new Promise((resolve, reject) => {
//         let timer = setInterval(() => {
//             const char = str[i];
//             if (char === "<") {
//                 i = str.indexOf(">", i); // skip to end of tag
//             }
    
//             div.innerHTML = str.slice(0, i+1);
    
//             if (++i >= str.length) {
//                 clearInterval(timer);
//                 intervals.splice(spot, 1)
//                 resolve("line done");
//             }
//         }, delay);
//         intervals.push(timer);
//     });
//     return p;
// }

function typewriters(diags, divs, r) {
    let c = 0;
    let spot = intervals.length;
    let timer = setInterval(() => {
        let str = diags[r].text;
        const char = str[c];
        if (char === "<") {
            c = str.indexOf(">", c); // skip to end of tag
        }

        divs[r].innerHTML = str.slice(0, c+1);

        if (++c >= str.length) {
            {
                if (++r >= diags.length) {
                    clearInterval(timer);
                    intervals.splice(spot, 1);
                }
                else {
                    clearInterval(timer);
                    intervals.splice(spot, 1);
                    setTimeout(()=>{
                        typewriters(diags, divs, r);
                    }, diags[r].interval);
                }
            }
        }
    }, diags[r].delay);
    intervals.push(timer);
}

start()