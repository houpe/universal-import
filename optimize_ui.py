import os
import re

directory = 'src'

replacements = {
    r'bg-gradient-to-br from-\[#004B64\] to-\[#004B64\]': 'bg-[#004B64]',
    r'bg-gradient-to-r from-\[#004B64\] to-\[#004B64\]': 'bg-[#004B64] hover:bg-[#003d52]',
    r'bg-gradient-to-r from-\[#004B64\] to-indigo-500': 'bg-[#004B64] hover:bg-[#003d52]',
    r'bg-gradient-to-br from-\[#004B64\] to-cyan-500': 'bg-[#004B64] hover:bg-[#003d52]',
    r'bg-gradient-to-r from-\[#004B64\] to-cyan-500': 'bg-[#004B64] hover:bg-[#003d52]',
    r'from-\[#004B64\] to-purple-500': 'bg-[#004B64] text-white',
    r'from-emerald-500 to-teal-500': 'bg-[#004B64] text-white',
    r'from-orange-500 to-amber-500': 'bg-[#004B64] text-white',
    r'from-\[#004B64\] to-\[#004B64\]': 'bg-[#004B64] text-white',
    r'bg-gradient-to-br\s+bg-\[#004B64\] text-white': 'bg-[#004B64] text-white',
    r'bg-gradient-to-br\s+from-\[#004B64\] to-\[#004B64\] text-white': 'bg-[#004B64] text-white',
    r'shadow-lg': 'shadow-md',
    r'shadow-md': 'shadow-sm',
    r'animate-float': '',
    r'animate-scaleIn': '',
    r'rounded-2xl': 'rounded-xl',
    r'rounded-xl': 'rounded-lg',
    r'border-gray-100': 'border-slate-200/60',
    r'bg-gray-50': 'bg-slate-50',
    r'bg-white/50': 'bg-slate-50/50',
    r'text-gray-500': 'text-slate-500',
    r'text-gray-900': 'text-slate-800',
    r'text-gray-700': 'text-slate-700',
    r'text-gray-600': 'text-slate-600',
    r'bg-white': 'bg-white/90 backdrop-blur-sm', # adds a bit of atmospheric glass to cards
}

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
