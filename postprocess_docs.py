import os
import shutil
import re

def process_file(filepath):
    # Reads a file, removes the first two lines, and writes back to the same file.
    with open(filepath, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    new_content = lines[2:]

    with open(filepath, 'w', encoding='utf-8') as file:
        file.writelines(new_content)

def adjust_headers(filepath):
    # Reads a file, adjusts Markdown headers, and writes back to the same file.
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Adjust headers: Reduce one '#' from headers
    adjusted_content = re.sub(r"^(#+) ", lambda m: m.group(1)[:-1] + " ", content, flags=re.MULTILINE)

    with open(filepath, 'w', encoding='utf-8') as file:
        file.write(adjusted_content)

def explore_directory(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                process_file(os.path.join(root, file))
                if 'classes' in root:  # Check if the file is in the 'classes' directory
                    adjust_headers(os.path.join(root, file))

def remove_useless_docs(directory):
    # modules
    modules_dir = os.path.join(directory, 'modules')
    if os.path.exists(modules_dir):
        shutil.rmtree(modules_dir)
    # README.md
    readme_file = os.path.join(directory, 'README.md')
    if os.path.exists(readme_file):
        os.remove(readme_file)

docs_directory = 'docs'

remove_useless_docs(docs_directory)
explore_directory(docs_directory)
