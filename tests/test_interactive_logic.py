import unittest
import os
import re

class TestInteractiveLogic(unittest.TestCase):
    def setUp(self):
        self.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.level_files = ['jp_n1.html', 'jp_n2.html', 'jp_n3.html', 'jp_n4.html', 'jp_n5.html']

    def test_toggle_mastered_logic(self):
        """Verify toggleMastered exists and contains logic to update masteredIds."""
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for the existence of toggleMastered
            self.assertIn("function toggleMastered", content, f"toggleMastered function not found in {level_file}")

            # Check for logic: adds to masteredIds if not present, removes if it is
            self.assertTrue(re.search(r"masteredIds\.push", content), f"masteredIds.push logic not found in {level_file}")
            self.assertTrue(re.search(r"masteredIds\.splice", content), f"masteredIds.splice logic not found in {level_file}")

    def test_save_and_sync_logic(self):
        """Verify existence of a function that updates LocalStorage and DOM classes."""
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for save and refresh function (name might vary slightly, e.g., saveAndRefresh, saveAndSync)
            has_save_fn = "saveAndRefresh" in content or "saveAndSync" in content
            self.assertTrue(has_save_fn, f"Save/Sync function not found in {level_file}")

            # Check for LocalStorage usage
            self.assertIn("localStorage.setItem", content, f"localStorage.setItem usage not found in {level_file}")

            # Check for DOM class toggling (graying out)
            self.assertIn("classList.toggle('is-mastered'", content, f"DOM graying out logic not found in {level_file}")

    def test_flashcard_scoring_logic(self):
        """Verify flashcard scoring system and auto-mastery at 10 points."""
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for processFC function
            self.assertIn("function processFC", content, f"processFC function not found in {level_file}")

            # Check for mastery auto-trigger at score >= 10
            # Expecting something like: if (scores.jpToZh >= 10 && scores.zhToJp >= 10) { masteredIds.push(...) }
            mastery_trigger_pattern = r"if\s*\(scores\.jpToZh\s*>=\s*10\s*&&\s*scores\.zhToJp\s*>=\s*10\)"
            self.assertTrue(re.search(mastery_trigger_pattern, content), f"Flashcard mastery trigger logic not found in {level_file}")

    def test_hide_mastered_toggle_button(self):
        """Verify existence of the toggle button and its CSS class effect."""
        for level_file in self.level_files:
            path = os.path.join(self.base_dir, level_file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for toggle-hide button ID
            self.assertIn('id="toggle-hide"', content, f"Hide/Show Mastery button not found in {level_file}")

            # Check for the CSS rule that handles the hiding
            # Expecting something like: .hide-mastered .is-mastered { display: none !important; }
            hide_css_pattern = r"\.hide-mastered\s+\.is-mastered\s*{\s*display:\s*none\s*!important;\s*}"
            self.assertTrue(re.search(hide_css_pattern, content), f"Hide Mastered CSS rule not found in {level_file}")

if __name__ == '__main__':
    unittest.main()
