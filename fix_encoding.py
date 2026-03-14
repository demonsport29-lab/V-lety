
import os

def fix_encoding(file_path):
    encodings = ['utf-8', 'windows-1250', 'iso-8859-2']
    content = None
    
    # Try reading as binary first to analyze
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    
    # Try different decodings
    for enc in encodings:
        try:
            content = raw_data.decode(enc)
            # If we found sequences like 'Ăˇ', it's likely UTF-8 interpreted as ISO/Windows
            # but if we decode as windows-1250, we might get the original intent.
            # Actually, if the file is ALREADY UTF-8 but looks like 'OchrannĂˇ', 
            # then decoding it as ISO-8859-1 and then encoding back as UTF-8 might fix it.
            
            # Special check for 'Ă' which is a common start of double-byte UTF-8
            if 'Ă' in content and enc != 'utf-8':
                # This might be a double-encoded UTF-8
                pass
            
            print(f"Successfully decoded {file_path} using {enc}")
            break
        except:
            continue
            
    if content:
        # Surgical fix for common double-encoded UTF-8 strings in Czech
        # OchrannĂˇ -> Ochranná
        # ĹˇenĂ­ -> šení
        # Let's try to detect if it was double encoded
        try:
            # If it's double-encoded, this sequence: raw -> utf-8 (string) -> latin-1 (bytes) -> utf-8 (string)
            # would fix it.
            repaired = content.encode('raw_unicode_escape').decode('utf-8')
            if repaired != content:
                print(f"Found and fixed double-encoding in {file_path}")
                content = repaired
        except:
            pass
            
        # Write back as clean UTF-8
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

files = [
    r'd:\Výlety\public\js\app.js',
    r'd:\Výlety\public\css\style.css',
    r'd:\Výlety\public\index.html'
]

for f in files:
    if os.path.exists(f):
        fix_encoding(f)
    else:
        print(f"File not found: {f}")
