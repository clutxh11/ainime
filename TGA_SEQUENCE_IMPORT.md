# TGA Sequence Import Feature

This feature allows you to import TGA image sequences into the Compositing Editor, similar to how After Effects handles sequence imports.

## Features

### TGA File Support
- **Native TGA Decoding**: Uses the `tga-js` library to decode TGA files in the browser
- **Automatic Conversion**: TGA files are automatically converted to PNG format for display
- **Fallback Support**: If TGA decoding fails, falls back to direct file usage

### Sequence Detection
The system automatically detects numbered image sequences when you drop multiple files. Supported patterns include:

- `name.0001.tga`, `name.0002.tga`, `name.0003.tga`
- `name_0001.tga`, `name_0002.tga`, `name_0003.tga`
- `name-0001.tga`, `name-0002.tga`, `name-0003.tga`
- `name0001.tga`, `name0002.tga`, `name0003.tga`
- `name.1.tga`, `name.2.tga`, `name.3.tga`
- `name1.tga`, `name2.tga`, `name3.tga`

### Import Options
When a sequence is detected, you'll see a confirmation modal with two options:

1. **Import as Image Sequence**: All frames are imported in order, maintaining the sequence structure
2. **Import as Individual Images**: Each frame is treated as a separate, independent image

## Usage

### Basic TGA Import
1. Drag and drop a single TGA file onto the Assets panel or a folder
2. The file will be automatically decoded and displayed
3. TGA files work exactly like PNG/JPEG files for all operations (move, rotate, scale)

### Sequence Import
1. Drag and drop multiple numbered TGA files at once
2. The system will detect if they form a sequence
3. Choose your import preference in the confirmation modal
4. All frames will be imported in the correct order

### In Compositing Mode
- **Single TGA**: Appears as a regular asset that can be manipulated
- **TGA Sequence**: Each frame becomes a separate row in the timeline (R1 F1, R2 F1, R3 F1, etc.)
- **Z-Order Control**: Use the "Move Up/Down" buttons to control stacking order
- **Transformations**: Rotation, scaling, and movement are preserved per frame

## Technical Details

### File Processing
- TGA files are decoded using `tga-js` library
- Decoded image data is converted to PNG format using HTML5 Canvas
- Blob URLs are created for efficient memory management
- Automatic cleanup prevents memory leaks

### Performance
- Processing happens asynchronously to avoid UI blocking
- Image caching improves rendering performance
- Blob URLs are automatically cleaned up when components unmount

### Error Handling
- Graceful fallback if TGA decoding fails
- Console logging for debugging sequence detection
- User-friendly error messages for failed imports

## Browser Compatibility
- **Chrome/Edge**: Full TGA support with native decoding
- **Firefox**: Full TGA support with native decoding
- **Safari**: Full TGA support with native decoding
- **Mobile**: Limited TGA support (fallback to direct file usage)

## File Size Considerations
- Large TGA sequences may take time to process
- Memory usage scales with image dimensions and frame count
- Consider using compressed formats for very long sequences

## Troubleshooting

### TGA Files Not Displaying
1. Check browser console for error messages
2. Verify file format is valid TGA
3. Try refreshing the page and re-importing

### Sequence Not Detected
1. Ensure file names follow the supported patterns
2. Check that frame numbers are consecutive
3. Verify all files have the same extension

### Performance Issues
1. Close other browser tabs to free memory
2. Process sequences in smaller batches
3. Use compressed image formats for very large sequences
