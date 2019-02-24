#!/usr/bin/env node
"use strict"

//
// dependencies
//

// native
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")

// 3th party
const im = require("imagemagick")
const rimraf = require("rimraf")
const mkdirp = require("mkdirp")
const program = require("commander")

//
// helpers
//

const log = (...args) => console.log(...args)

const forEachPromise = (items, fn) => {
    return items.reduce((promise, item, idx) => {
        return promise.then(() => fn(item, idx))
    }, Promise.resolve())
}

//
// contants
//

const DEFAULT_INPUT_DIR = "."
const DEFUALT_OUTPUT_DIR = "."
const ORIGINAL_FILE_EXTENSION = ".jpg"
const TEMP_DIR_NAME = crypto.randomBytes(16).toString("hex")
const TEMP_FIRST_FILE_SUFFIX = "-samesize"
const TEMP_SECOND_FILE_SUFFIX = "-newsize"
const TEMP_FILE_EXTENSION = ".png"
const CONVERTED_FILE_SUFFIX = "-converted"
const MIN_DIMENSION = 1
const MAX_DIMENSION = 10000

//
// validation
//

const parseRelativePath = (str) => {
    const absolute_path = (str.charAt(0) !== "/") ? path.join(".", str) : str

    if (!fs.existsSync(absolute_path)) {
        mkdirp.sync(absolute_path)
    }

    return absolute_path
}

const parseDimension = (str) => {
    const int = parseInt(str)

    if (isNaN(int)) {
        return false
    }

    if (int < MIN_DIMENSION || int > MAX_DIMENSION) {
        return false
    }

    return int
}

//
// core helpers
//

const createFirstTempFileName = (file_name) => {
    return file_name.replace(ORIGINAL_FILE_EXTENSION, TEMP_FIRST_FILE_SUFFIX + TEMP_FILE_EXTENSION)
}

const createSecondTempFileName = (file_name) => {
    return file_name.replace(TEMP_FIRST_FILE_SUFFIX, TEMP_SECOND_FILE_SUFFIX)
}

const createConvertedFileName = (file_name) => {
    return file_name.replace(TEMP_SECOND_FILE_SUFFIX + TEMP_FILE_EXTENSION, CONVERTED_FILE_SUFFIX + ORIGINAL_FILE_EXTENSION)
}

//
// core
//

const convertJpgToPng = (input_dir, original_file_name, temp_dir_path) => {
    return new Promise((resolve, reject) => {
        const original_file_path = path.join(input_dir, original_file_name)
        const temp_first_file_name = createFirstTempFileName(original_file_name)

        im.convert([original_file_path, path.join(temp_dir_path, temp_first_file_name)], (e) => {
            return (e) ? reject(e) : resolve(temp_first_file_name)
        })
    })
}

const resizePng = (temp_first_file_name, temp_dir_path, new_width, new_height) => {
    return new Promise((resolve, reject) => {
        const temp_second_file_name = createSecondTempFileName(temp_first_file_name)

        if (new_height && new_width) { // resize to "width/height", keep aspect ratio
          im.resize({
              "srcPath": path.join(temp_dir_path, temp_first_file_name),
              "dstPath": path.join(temp_dir_path, temp_second_file_name),
              "width": new_width,
              "height": new_height
          }, (e) => {
              (e) ? reject(er) : resolve(temp_second_file_name)
          })
        } else if (new_height) { // resize to "height", keep aspect ratio
          im.convert([
            path.join(temp_dir_path, temp_first_file_name),
            '-geometry',
            `x${new_height}`,
            path.join(temp_dir_path, temp_second_file_name),
          ], (e) => {
              (e) ? reject(er) : resolve(temp_second_file_name)
          });
        } else if (new_width) { // resize to "width", keep aspect ratio
          im.convert([
            path.join(temp_dir_path, temp_first_file_name),
            '-resize',
            `${new_width}`,
            path.join(temp_dir_path, temp_second_file_name),
          ], (e) => {
              (e) ? reject(er) : resolve(temp_second_file_name)
          });
        }
    });
}

const convertPngToJpg = (temp_second_file_name, temp_dir_path, outputdir_path) => {
    return new Promise((resolve, reject) => {

        const converted_file_name = createConvertedFileName(temp_second_file_name)

        im.convert([
            "-strip",
            path.join(temp_dir_path, temp_second_file_name),
            path.join(outputdir_path, converted_file_name)
        ], (e) => {
            return (e) ? reject(e) : resolve(converted_file_name)
        })
    })
}

const getJpgFiles = (input_dir) => {
    return fs.readdirSync(input_dir)
        // only get jpg files
        .filter((filename) => path.extname(filename) === ORIGINAL_FILE_EXTENSION)
}

//
// start
//

function main() {

    // get cli args
    program
      .version("0.1.0")
      .usage("<options>")
      .option("-i, --input_dir <input_dir>", "input directory (default: current directory)", parseRelativePath, parseRelativePath(DEFAULT_INPUT_DIR))
      .option("-o, --output_dir <output_dir>", "output directory (default: current directory)", parseRelativePath, parseRelativePath(DEFUALT_OUTPUT_DIR))
      .option("-w, --resize_width <resize_width>", `resize width (min: ${MIN_DIMENSION}, max: ${MAX_DIMENSION})`, parseDimension)
      .option("-h, --resize_height <resize_height>", `resize height (min: ${MIN_DIMENSION}, max: ${MAX_DIMENSION})`, parseDimension)
      .parse(process.argv)
    if (!program.resize_width && !program.resize_height) {
        program.outputHelp()
    }

    // find jpg files in input_dir
    const original_files_name = getJpgFiles(program.input_dir)
    if (!original_files_name.length) {
        log(`no jpg files found in ${program.input_dir}`)
        return
    }

    // create temp_dir
    const temp_dir_path = path.join(program.output_dir, TEMP_DIR_NAME)
    mkdirp.sync(temp_dir_path)

    // for each found jpg file
    forEachPromise(original_files_name, (original_file_name, idx) => {

        // convert the jpg file to  apng file with the same dimensions
        return convertJpgToPng(program.input_dir, original_file_name, temp_dir_path)
            .then((temp_first_file_name) => {

                // resize the png to a png of the desired dimensions
                return resizePng(temp_first_file_name, temp_dir_path, program.resize_width, program.resize_height)
            })
            .then((temp_second_file_name) => {
                // convert the png to a jpg of the same dimensions
                return convertPngToJpg(temp_second_file_name, temp_dir_path, program.output_dir)
            })
            .then((converted_file_name) => {
                log(`(${idx + 1}/${original_files_name.length}) resized ${path.basename(original_file_name)} to ${converted_file_name}`)
            })
    })
    .then(() => {
        log(`Done, resized ${original_files_name.length} jpg files (input dir: ${program.input_dir}, output dir: ${program.output_dir})`)
    }).catch((e) => {
        log("!!! ERROR !!!")
        console.log(e)
    }).then(() => {
        // always remove the temp directory (also when script errors out)
        rimraf.sync(temp_dir_path)
    })
}

main()
