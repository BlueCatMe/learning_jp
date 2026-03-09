import unittest
import os
import re
from bs4 import BeautifulSoup

class TestSite(unittest.TestCase):
    def setUp(self):
        # Path to the root of the project
        self.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.index_path = os.path.join(self.base_dir, 'index.html')
        self.level_files = ['jp_n1.html', 'jp_n2.html', 'jp_n3.html', 'jp_n4.html', 'jp_n5.html']

    def test_index_exists(self):
        self.assertTrue(os.path.exists(self.index_path), "index.html not found.")

    def test_level_files_exist(self):
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            self.assertTrue(os.path.exists(path), f"{level_file} not found.")

    def test_index_navigation_links(self):
        """Verify index.html contains links to all JLPT levels."""
        with open(self.index_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')

        found_links = [a['href'] for a in soup.find_all('a', href=True)]
        for level in self.level_files:
            self.assertIn(level, found_links, f"Link to {level} not found in index.html")

    def test_back_to_home_links(self):
        """Verify each level page has a link back to index.html."""
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            with open(path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')

            # Look for links to index.html (the Home button we added)
            home_links = soup.find_all('a', href='index.html')
            self.assertGreaterEqual(len(home_links), 1, f"{level_file} is missing a link to index.html")

    def test_disclaimer_presence(self):
        """Verify all HTML pages contain the disclaimer footer."""
        all_pages = ['index.html'] + self.level_files
        disclaimer_text = "⚖️ 免責聲明與著作權說明"
        commercial_intent_text = "本項目完全不具備任何商業營利意圖"

        for page in all_pages:
            path = os.path.join(self.base_dir, page)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            self.assertIn(disclaimer_text, content, f"Disclaimer title missing in {page}")
            self.assertIn(commercial_intent_text, content, f"Commercial intent statement missing in {page}")
            self.assertIn("https://github.com/BlueCatMe/learning_jp", content, f"GitHub link missing in {page}")

    def test_content_integrity(self):
        """Check if grammar and vocabulary data arrays are present and non-empty."""
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check grammarData
            self.assertIn("grammarData", content, f"grammarData not found in {level_file}")
            # Check for at least some grammar points (expecting 'g1', 'g2', etc.)
            self.assertGreater(len(re.findall(r"id: 'g\d+'", content)), 20, f"Too few grammar points found in {level_file}")

            # Check for vocab (either rawVocab or vocabData)
            has_vocab = "rawVocab =" in content or "vocabData =" in content
            self.assertTrue(has_vocab, f"Vocabulary data not found in {level_file}")
            # Vocab arrays should have some entries
            # Simple check for multiple elements in array
            self.assertGreater(content.count("],"), 50, f"Vocabulary array seems empty or too small in {level_file}")

if __name__ == '__main__':
    unittest.main()
