/* @flow */
// We need native macOS fonts and colors for these hacks so import the old utils
import type { SJTextStyle } from 'sketchapp-json-flow-types';
import { toSJSON } from 'sketchapp-json-plugin';
import normalizeColor from 'normalize-css-color';
import findFont from '../utils/findFont';
import type { TextStyle } from '../types';
import { generateID } from './models';
import { TEXT_ALIGN, TEXT_TRANSFORM } from '../utils/applyTextStyleToLayer';

// Awkwardly we encode then immediately decode the JSON, but seems like
function encodeSketchJSON(sketchObj) {
  const encoded = toSJSON(sketchObj);
  return JSON.parse(encoded);
}

function makeParagraphStyle(textStyle) {
  const pStyle = NSMutableParagraphStyle.alloc().init();
  if (textStyle.lineHeight !== undefined) {
    pStyle.minimumLineHeight = textStyle.lineHeight;
    pStyle.maximumLineHeight = textStyle.lineHeight;
  }

  if (textStyle.textAlign) {
    pStyle.alignment = TEXT_ALIGN[textStyle.textAlign];
  }

  return pStyle;
}

export const makeImageDataFromUrl = (url: string): MSImageData => {
  const imageData = NSImage.alloc().initByReferencingURL(NSURL.URLWithString(url));

  return MSImageData.alloc().initWithImage_convertColorSpace(imageData, false);
};

// This shouldn't need to call into Sketch, but it does currently, which is bad for perf :(
export function makeAttributedString(string: ?string, textStyle: TextStyle) {
  const font = findFont(textStyle);

  const color = normalizeColor.rgba(normalizeColor(textStyle.color || 'black'));

  const attribs: Object = {
    MSAttributedStringFontAttribute: font.fontDescriptor(),
    NSParagraphStyle: makeParagraphStyle(textStyle),
    NSColor: NSColor.colorWithDeviceRed_green_blue_alpha(
      color.r / 255,
      color.g / 255,
      color.b / 255,
      color.a,
    ),
  };

  if (textStyle.letterSpacing !== undefined) {
    attribs.NSKern = textStyle.letterSpacing;
  }

  if (textStyle.textTransform !== undefined) {
    attribs.MSAttributedStringTextTransformAttribute = TEXT_TRANSFORM[textStyle.textTransform] * 1;
  }

  const attribStr = NSAttributedString.attributedStringWithString_attributes_(string, attribs);
  const msAttribStr = MSAttributedString.alloc().initWithAttributedString(attribStr);

  return encodeSketchJSON(msAttribStr);
}

export function makeTextStyle(textStyle: TextStyle) {
  const pStyle = makeParagraphStyle(textStyle);

  const font = findFont(textStyle);

  const color = normalizeColor.rgba(normalizeColor(textStyle.color || 'black'));

  const value: SJTextStyle = {
    _class: 'textStyle',
    encodedAttributes: {
      MSAttributedStringFontAttribute: encodeSketchJSON(font.fontDescriptor()),
      NSColor: encodeSketchJSON(
        NSColor.colorWithDeviceRed_green_blue_alpha(
          color.r / 255,
          color.g / 255,
          color.b / 255,
          color.a,
        ),
      ),
      NSParagraphStyle: encodeSketchJSON(pStyle),
      NSKern: textStyle.letterSpacing || 0,
      MSAttributedStringTextTransformAttribute: TEXT_TRANSFORM[
        textStyle.textTransform || 'initial'
      ] * 1,
    },
  };

  return {
    _class: 'style',
    sharedObjectID: generateID(),
    miterLimit: 10,
    startDecorationType: 0,
    endDecorationType: 0,
    textStyle: value,
  };
}
