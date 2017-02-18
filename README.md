# resize jpg

Ever wanted to resize a `jpg` image and getting awful results when just directly resizing
the `jpg`? Why doesn't that work? Well, `jpg` are not made to be resized without quality loss.
But `png` images can be resized without (visible) quality loss. So what about converting
the `jpg` to a `png`, then resizing the `png`, and then converting the resized `png` back to
a `jpg` of the same dimensions. Problem solved.

That's what this cli app is for. And you can convert an entiry directory of jpg files in one go!

## Install

you need `imagemagick` for this.

```bash
brew install imagemagick # for Mac os
```

```bash
npm install -g resize-jpg
```

## Usage

Say I am in the terminal in my home directory. In my home directory I have a folder
named `my_jpg_files` with `jpg` images of various dimensions that I want to resize (all of them)  to width `700px` and height
`800px` and I want to place the converted `jpg` files in a folder named `my_converted_jpg_files`.

To do the above do (when in your home directory in the terminal):

```bash
resize-jpg -i my_jpg_files -o my_converted_jpg_files -w 700 -h 800
```

for help type

```bash
resize-jpg
# OR
resize-jpg -h
# OR
resize-jpg --help
```

## What it does under the hood

it loops over all `jpg` files found in the input directory and uses `imagemagick` to for each file convert the file:

1. from `jpg` original size to `png` original size
2. from `png` original size to `png` wanted size
3. from `png` wanted size to `jpg` wanted size

## TODO

- [ ] use [jimp](https://github.com/oliver-moran/jimp) pure-js image conversion module, instead of `imagemagick`
