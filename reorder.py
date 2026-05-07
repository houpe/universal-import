with open('src/app/import/page.tsx', 'r') as f:
    lines = f.readlines()

stats_start = -1
stats_end = -1
how_to_use_start = -1
how_to_use_end = -1

for i, line in enumerate(lines):
    if '          {/* Stats Cards */}' in line:
        stats_start = i
    if '          {/* Saved templates indicator */}' in line:
        stats_end = i
    if '          {/* How to use */}' in line:
        how_to_use_start = i
    if '          {/* Supported Fields */}' in line:
        supported_fields_start = i
    if '      {step === \'parsing\' && (' in line:
        how_to_use_end = i - 2 # To avoid the closing div and blank lines

if stats_start != -1 and stats_end != -1 and how_to_use_start != -1:
    how_to_use_block = lines[how_to_use_start:how_to_use_end]
    # Remove how to use block from its original position
    del lines[how_to_use_start:how_to_use_end]
    
    # Insert it before Stats Cards
    # Also add a blank line between them
    lines = lines[:stats_start] + how_to_use_block + ['\n'] + lines[stats_start:]
    
    with open('src/app/import/page.tsx', 'w') as f:
        f.writelines(lines)
    print("Successfully reordered blocks.")
else:
    print("Could not find blocks.")
