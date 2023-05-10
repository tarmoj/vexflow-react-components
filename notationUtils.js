
export const defaultNotationInfo = {
    options: "", // scale, width, space etc, if needed
    //currentStaff:  0,
    //currentStaff:  0,
    // it were more logical if stave and key were defined here, but I will change it later...
    //key:"F",
    //time: "4/4",
    staves: [
        {
            clef:"treble",
            key:"C",
            time: "4/4",
            measures : [ {
                number : 1, // optional
                //startBar: "", // optional can be: |  ||  |. etc (lilypond style)  :|.
                endBar: "|",
                // also possible to define new key or clef here
                // in the code -  if measure.hasOwnProperty.clef etc
                notes: [
                    { clef: "treble", keys: ["g/4"], duration: "4", auto_stem: "true" ,
                        //tied: true, // tie is on the note, where it starts (similar to Lilypond logic
                        //color:"green"
                        /*optional: text:"something", position:""*/ }, // cannot be empty, vf requires that the measure is filled... or perhaps there is a way to override it
                ]
            },
                // // second measure etc

            ],


        },
        // second  stave

    ],

};

// params come in as encoded html, need to decode
export const  decodeHtml = (text) => {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/ , '<')
        .replace(/&gt;/, '>')
        .replace(/&quot;/g,'"')
        .replace(/&#039;/g,"'");
}


// Deep clones an object
export const deepClone = (obj) => { // from util/util
    return JSON.parse(JSON.stringify(obj));
};

const simplify = (string) => {
    if (typeof(string)==="string") {
        let result = string.replaceAll("\n", " "); // newlines to spaces
        return result.trim().replace(/\s\s+/g, ' '); // remove extra spaces
    } else {
        return string;
    }
}

export const noteNames = new Map([
    ["ceses","Cbb"], ["ces","Cb"], ["c","C"], ["cis","C#"], ["cisis","C##"],
    ["deses","Dbb"], ["des", "Db"], ["d", "D"], ["dis","D#"], ["disis","D##"],
    ["eses","Ebb"], ["es","Eb"], ["e","E"], ["eis","E#"], ["eisis","E##"],
    ["feses","Fbb"], ["fes","Fb"], ["f","F"], ["fis","F#"], ["fisis","F##"],
    ["geses","Gbb"], ["ges","Gb"], ["g","G"], ["gis","G#"], ["gisis","G##"],
    ["ases","Abb"], ["as","Ab"], ["a","A"], ["ais","A#"], ["aisis","A##"],
    ["heses","Bbb"], ["b","Bb"], ["h","B"], ["his","B#"], ["hisis","B##"]
]);

const durationMap = new Map([
    ["4",1], ["2",2], ["1",4], ["8",0.5], ["16",0.25], ["32", 0.125],
    ["4d",1.5], ["2d",3], ["1d",6], ["8d",0.75], ["16d",0.375]
]);


export const parseLilypondDictation = (lyDictation) => { // returns returns notationInfo object. Input can be either string
// for one-voiced dications or object { stave1:"", stave2, "" }. More than 2 staves not supported, currently one voice per stave.
    let notationInfo = deepClone(defaultNotationInfo);
    if (typeof(lyDictation)==="string") {
        const stave = parseLilypondString(lyDictation);
        if (stave) {
            notationInfo.staves[0] = stave;
        } else {
            console.log("Stave is null!");
            return null;
        }

    } else if ( typeof(lyDictation)==="object" ) {
        if (lyDictation.hasOwnProperty("stave1")) {
            const stave1 = parseLilypondString(lyDictation.stave1);
            if (stave1) {
                notationInfo.staves[0] = stave1;
            } else {
                console.log("stave1 is null");
                return null;
            }

        }
        if (lyDictation.hasOwnProperty("stave1")) {
            const stave2 = parseLilypondString(lyDictation.stave2);
            if (stave2) {
                notationInfo.staves[1] = stave2;
            } else {
                console.log("stave2 is null");
                return null;
            }
        }
        //etc if more voices needed
    } else {
        console.log("Unknown lyDictation: ", lyDictation);
        return null;
    }

    return notationInfo;

};


export const parseLilypondString = (lyString) => {
    if (!lyString) {
        alert("Lilypond string is empty!");
        return null;
    }

    const chunks = simplify(lyString).split(" ");
    let stave=deepClone(defaultNotationInfo.staves[0]);
    let notes = [] ; // each note has format {keys:[], duration: "", [optional-  chord: ""]}
    let lastDuration = "4";
    let measureIndex = 0;
    let barLine = "";
    let durationSum = 0;
    let barDuration = 4; // default is 4/4

    for (let i = 0; i<chunks.length; i++) {
        chunks[i] = chunks[i].trim(); // to avoid error on string like " |\ng'8"

        if (chunks[i] === "\\key" && chunks.length >= i+1 ) { // must be like "\key a \major\minor
            //console.log("key: ", chunks[i+1], chunks[i+2]);
            let vfKey = noteNames.get(chunks[i+1].toLowerCase());
            if (vfKey) {
                if (chunks[i+2]==="\\minor") {
                    vfKey += "m"
                }
                stave.key = vfKey;
            } else {
                console.log("Could not find notename for: ", chunks[i+1])
            }
            i += 2;
        } else if (chunks[i] === "\\time" && chunks.length >= i+1) { // must be like "\time 4/4
            stave.time = chunks[i + 1];
            const timeParts = stave.time.split("/");
            if (timeParts.length === 2) {
                const inQuarters = parseInt(timeParts[0]) *  4/parseInt(timeParts[1]);
                //console.log("Bar duration: ", inQuarters);
                if (inQuarters) {
                    barDuration = inQuarters;
                };
            }
            i += 1;
        } else if (chunks[i] === "\\clef" && chunks.length >= i+1) {
            const clef = chunks[i + 1].trim().replace(/["]+/g, ''); // remove quoates \"
            stave.clef = clef;
            i += 1;
        } else if  (chunks[i] === "\\bar" && chunks.length >= i+1)  { // handle different barlines
            barLine = chunks[i + 1].trim().replace(/["]+/g, ''); // remove quotes \"
            // lilypond barlines: | |. ||  .|: :|.   :|.|:
            i += 1;
        } else if     ( ["|", "|.", "||",  ".|:", ":|.",   ":|.|:"].includes( chunks[i])) {
            barLine = chunks[i];
            // if (i===chunks.length-1 && chunks[i]==="|" ) {
            //     barLine = "|.";
            //     console.log("Replace last single barline with end barline");
            // } else {
            //     barLine = chunks[i];
            // }


            // TODO: if last bar, how to replace with |. ?
        }  else if (chunks[i].startsWith("-") || chunks[i].startsWith("^") ) { // ^ -  text above note, - -under note
            // TODO: find a vexflow solution see Vex.Flow.TextNote - test it in TryOut
            if (notes.length > 0) {
                const text = chunks[i].substr(1).replace(/["]+/g, ''); // remove quotes, remove first char
                //notes[notes.length-1].text = text;
                //notes[notes.length-1].textPosition = chunks[i].charAt(0)==='^' ?  "top" : "bottom";
                console.log("Found text, position: ", text, notes[notes.length - 1].textPosition);
            }
        } else  { // might be a note or error
            let vfNote="";
            const index = chunks[i].search(/[~,'\\\d\s]/); // in lylypond one of those may follow th note: , ' digit \ whitespace or nothing
            let noteName;
            if (index>=0) {
                noteName = chunks[i].slice(0, index);
            } else {
                noteName = chunks[i].toLowerCase();
            }

            if (noteName === "r") { // rest
                vfNote = "r"; // to signal it is a rest
            } else {
                if (! noteNames.has(noteName)) { // ERROR
                    alert("Unknown note: " + noteName);
                    return null;
                    //break;
                }
                //console.log("noteName is: ", noteName);
                vfNote = noteNames.get(noteName);

                //for now octave by absolute notation ' - 1st oct, '' -2nd, none - small, , - great etc.
                let octave;
                // use better regexp and test for '' ,, etc
                if (chunks[i].search("'''")>=0) {
                    octave = "6";
                } else if (chunks[i].search("''")>=0) {
                    octave = "5";
                } else if (chunks[i].search("'")>=0) {
                    octave = "4";
                } else if (chunks[i].search(",")>=0) {
                    octave ="2";
                } else if (chunks[i].search(",,")>=0) {
                    octave ="1";
                } else { // no ending
                    octave = "3";
                }

                vfNote += "/" + octave;
            }

            // duration
            const re = /\d{1,2}(\.{0,1})+/; // was re = /\d+/; - but this skips the dot
            const result = re.exec(chunks[i]); // re.exec returns an array or string
            let duration = result ? result[0] : null;

            if (duration) {
                // double dot not implemented yet
                const originalDuration = duration;
                duration = duration.replace(/\./g, "d"); // d instead of dot for VexFlow
                if (!durationMap.has(duration)) {
                    alert("Unknown duration:  " + originalDuration );
                    return null;
                }

                lastDuration = duration;
            }

            durationSum += durationMap.get(lastDuration);
            //console.log("durationSum: ", durationSum);

            if (durationSum >= barDuration) { // && next chunk is not barLine // - perhaps check it befor anythin else?
                //barLine = "|"; // fake barline, probably does not work -  also an extra barline might be comin
                //console.log("Bar seems complete or over");
            }

            //console.log("vfNote: ", vfNote, duration, lastDuration);
            // note object:  { clef: "treble", keys: ["f/4"], duration: "8", auto_stem: "true" }
            let note = {keys: [vfNote], duration: lastDuration, clef: stave.clef, auto_stem: "true"};
            if (vfNote==="r") {
                note.keys= (stave.clef==="bass") ? ["d/3"] : ["b/4"];
                note.duration= lastDuration+"r";
            }
            if (chunks[i].includes("~")) { // check if the chunk IS ~" (ie not attached to note, add it to the previous one
                console.log("Found tie", chunks[i]);
                note.tied = true;
            }
            notes.push(note);

        }
        stave.measures[measureIndex].notes = notes;

        // drop support for starting barlines, not needed in dictations
        if (barLine /*|| durationSum >= barDuration*/) {
            stave.measures[measureIndex].endBar = barLine; // how to detect that it is end, not start barline? - Drop support for repetition, no startBArlines
            //console.log("barline", barLine);
            if (barLine !== "|."  && i!==chunks.length-1 ) { // if not last barline, then add a measure
                // should we check if duration of the measure is enough?
                measureIndex++;
                stave.measures.push({number: 1+measureIndex, notes:[], endBar: "|"});
                //console.log("moved index to new bar", measureIndex);
            }
            barLine = "" ; // reset
            durationSum = 0;
            notes = [];
        }
    }

    return stave;
};


// TODO: rework key (include arrays) !
export const getLyNoteByMidiNoteInKey = (midiNote, key="C") => { // key as tonality like C major, given as 'A' for A major, 'Am' for minor
    const pitchClass = midiNote%12;
    const octave = Math.floor(midiNote/12) - 1;
    let lyNote = "";
    switch (pitchClass) {
        case 0: lyNote = "c"; break;
        case 1: lyNote =  [ "F", "Bb", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "des" : "cis" ; break;
        case 2: lyNote = "d"; break;
        case 3: lyNote =  [ "C", "F", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "es" : "dis" ; break;
        case 4: lyNote = "e"; break;
        case 5: lyNote = "f"; break;
        case 6: lyNote = [ "F", "Bb", "Eb", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "gis" : "fis";  break;
        case 7: lyNote = "g"; break;
        case 8: lyNote = [ "F", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "as" : "gis";  break;
        case 9: lyNote = "a"; break;
        case 10: lyNote = [ "G", "D", "F", "Dm", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "b" : "ais";  break;
        case 11: lyNote = "h"; break;
        default: lyNote = "";
    }
    if (!lyNote) {
        return "";
    }  else {
        switch (octave) {
            case 2: lyNote += `,`; break;
            case 4: lyNote += `'`; break;
            case 5: lyNote += `''`; break;
            case 6: lyNote += `'''`; break;
        }
        // console.log("Detected lyNote: ", lyNote, pitchClass, octave, key);
        return lyNote;
    }

}

export const getVfNoteByMidiNoteInKey = (midiNote, key="C") => { // key as tonality like C major, given as 'A' for A major, 'Am' for minor
    const pitchClass = midiNote%12;
    const octave = Math.floor(midiNote/12) - 1;
    let vfNote = "";
    switch (pitchClass) {
        case 0: vfNote = "C"; break;
        case 1: vfNote =  [ "F", "Bb", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "Db" : "C#" ; break;
        case 2: vfNote = "D"; break;
        case 3: vfNote =  [ "C", "F", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "Eb" : "D#" ; break;
        case 4: vfNote = "E"; break;
        case 5: vfNote = "F"; break;
        case 6: vfNote = [ "F", "Bb", "Eb", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "Gb" : "F#";  break;
        case 7: vfNote = "G"; break;
        case 8: vfNote = [ "F", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "Ab" : "G#";  break;
        case 9: vfNote = "A"; break;
        case 10: vfNote = [ "G", "D", "F", "Dm", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "Bb" : "A#";  break;
        case 11: vfNote = "B"; break;
        default: vfNote = "";
    }
    if (!vfNote) {
        return "";
    }  else {
        vfNote += "/" + octave;
        // console.log("Detected vfNote: ", vfNote, pitchClass, octave, key);
        return vfNote;
    }

}


const getLyNoteName = (vfName) => {
    let lyNote = "";
    noteNames.forEach( (value, key) => {
        if (value.toLowerCase()===vfName.toLowerCase()) {
            // console.log("Found: ", key);
            lyNote =key; // this is the lilynote
        }
    });
    return lyNote;
}

const vfNoteToLyNote = (vfNote) => {
    const [note, octave] = vfNote.split("/");
    // console.log("Split vfNote:", note, octave);
    let lyNote = getLyNoteName(note);
    // console.log("lyNote in vfNoteToLyNote", lyNote);
    if (!lyNote) {
        return "";
    }  else {
        switch (octave) {
            case "2": lyNote += `,`; break;
            case "4": lyNote += `'`; break;
            case "5": lyNote += `''`; break;
            case "6": lyNote += `\'\'\'`; break;
        }
        // console.log("vfNote2LyNote lyNote: ", lyNote);
        return lyNote;
    }
}


export const notationInfoToLyString = notationInfo => {
    let lyString = ""; 
    // TODO: handle several staves somehow 
    for (let stave of notationInfo.staves) {
        let keyString = "";
        if (stave.key.endsWith("m")) { // minor
            const lyKeyNote = getLyNoteName(stave.key.slice(0, -1).toLowerCase());
            keyString =  lyKeyNote + " \\minor "
        } else {
            const lyKeyNote = getLyNoteName(stave.key.toLowerCase());
            keyString = lyKeyNote + " \\major "
        }
        lyString += `\\clef ${stave.clef} \\key ${keyString} \\time ${stave.time} \n`;
        for (let measure of stave.measures) {
            if (measure.notes.length>0) {
                for (let note of  measure.notes) {
                    // test if chord or single note. Several keys ->  ( . .  ) notation

                    if (note.keys.length>0) {
                        let noteString = "";

                        if (note.keys.length>1) {
                            console.log("Chords not supported yet");
                            //noteString = `<< ${note.keys.join(" ")} >>`;
                            // noteString = `<<  ${note.keys-> map -> vfNoteToLyNote(key)}  >>` or something similar
                        } else if (note.keys.length === 1) {
                            noteString = vfNoteToLyNote(note.keys[0]);
                            //console.log("note.keys[0], noteString now: ", note.keys[0], noteString );
                        }
                        if (note.keys[0]==="|" || note.keys[0].startsWith("=")) { // not the case any more. Handel barlines differently
                            //lyString += ` ${note.keys[0]} `; <- old barline handling
                        } else {
                            let durationString = note.duration.replace("d", ".");
                            //console.log("noteString 2", noteString)
                            if (durationString.endsWith("r")) { // rest
                                noteString = "r";
                                durationString = durationString.slice(0,-1);
                            }
                            lyString += ` ${noteString}${durationString} `;  // here are probably more conditions (triplets etc)
                            //console.log("lyString", lyString)
                        }
                        if (note.hasOwnProperty("tied") && note.tied) {
                            lyString = lyString.trimEnd() +  "~ "; // time mark must be rigth at the end of the chunk
                        }
                        if (note.hasOwnProperty("text")) {
                            // let positionString = ".top.";
                            // if (note.hasOwnProperty("textPosition")) {
                            //     if (note.textPosition === "bottom") {
                            //         positionString = ".bottom.";
                            //     }
                            // }
                            // lyString += ` \$${positionString}${note.text}\$ `;
                            //console.log("Added text to lyString: ", lyString);
                        }
                    }
                }
                lyString += measure.endBar;
                lyString += "\n";
            } else {
                lyString += " | \n"; // add empty bar if not notes
            }
        }
    }
    console.log("converted to ly: ", lyString)
    return lyString;
};

export const addMeasure= (notationInfo, count=1) => {
    if (!notationInfo) {
        console.log("addMeasure: notationInfo is null");
        return;
    }

    for (let i=0; i<count; i++) {
        for (let staff of notationInfo.staves) {
            staff.measures.push({  endBar: "|",  notes: [] });
        }
    }
}

export const removeMeasure = (notationInfo, measureIndex) => {
    if (!notationInfo) {
        console.log("removeMeasure: notationInfo is null");
        return;
    }

    if (notationInfo.staves[0].measures.length > 1  && measureIndex < notationInfo.staves[0].measures.length) {
        for (let staff of notationInfo.staves) {
            staff.measures.splice(measureIndex, 1);
        }
    } else {
        console.log("Wrong measure index to delete: ", measureIndex);
    }

}