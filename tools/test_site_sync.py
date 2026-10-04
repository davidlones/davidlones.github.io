import json
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('site_sync.py')


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo, self.live = self.root / 'repo', self.root / 'live'
        (self.repo / 'tools').mkdir(parents=True)
        (self.repo / 'config').mkdir()
        self.live.mkdir()
        (self.repo / 'tools/site_sync.py').write_bytes(SCRIPT.read_bytes())
        (self.repo / 'config/public-files.json').write_text(json.dumps({'files': ['index.html']}))
        (self.live / 'index.html').write_text('original')

    def run_sync(self, *args, ok=True):
        result = subprocess.run(['python3', str(self.repo / 'tools/site_sync.py'), *args, '--live', str(self.live)], text=True, capture_output=True)
        self.assertEqual(result.returncode == 0, ok, result.stderr)
        return result

    def commit(self):
        subprocess.run(['git', 'init', '-q', str(self.repo)], check=True)
        subprocess.run(['git', '-C', str(self.repo), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(self.repo), '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'], check=True)

    def test_import_is_explicit_and_materializes_links(self):
        (self.live / 'private.txt').write_text('private')
        target = self.root / 'resolved.html'
        target.write_text('original')
        (self.live / 'index.html').unlink()
        (self.live / 'index.html').symlink_to(target)
        self.run_sync('import-live')
        self.assertFalse((self.repo / 'site').exists())
        self.run_sync('import-live', '--apply')
        self.assertFalse((self.repo / 'site/index.html').is_symlink())
        self.assertFalse((self.repo / 'site/private.txt').exists())
        self.run_sync('check')

    def test_import_refuses_to_overwrite_git_edits(self):
        self.run_sync('import-live', '--apply')
        (self.repo / 'site/index.html').write_text('Git edit')
        (self.live / 'index.html').write_text('live edit')
        self.run_sync('import-live', '--apply', ok=False)
        self.assertEqual((self.repo / 'site/index.html').read_text(), 'Git edit')

    def test_path_and_secret_rejection(self):
        (self.repo / 'config/public-files.json').write_text(json.dumps({'files': ['../private']}))
        self.run_sync('import-live', '--apply', ok=False)
        (self.repo / 'config/public-files.json').write_text(json.dumps({'files': ['index.html']}))
        (self.live / 'index.html').write_text('-----BEGIN PRIVATE KEY-----')
        self.run_sync('import-live', '--apply', ok=False)
        self.assertFalse((self.repo / 'site').exists())

    def test_deploy_preserves_live_links_and_detects_drift(self):
        target = self.root / 'resolved.html'
        target.write_text('original')
        (self.live / 'index.html').unlink()
        (self.live / 'index.html').symlink_to(target)
        self.run_sync('import-live', '--apply')
        (self.repo / 'site/index.html').write_text('revision one')
        self.commit()
        args = ['deploy-live', '--apply', '--backup-root', str(self.root / 'backups')]
        target.write_text('unimported edit')
        self.run_sync(*args, ok=False)
        self.assertEqual(target.read_text(), 'unimported edit')
        target.write_text('original')
        self.run_sync(*args)
        self.assertTrue((self.live / 'index.html').is_symlink())
        self.assertEqual(target.read_text(), 'revision one')
        self.assertTrue(list((self.root / 'backups').glob('*/index.html')))
        self.run_sync(*args)  # Repeating the same revision is a no-op.
        (self.repo / 'site/index.html').write_text('revision two')
        self.commit()
        self.run_sync(*args)
        self.assertEqual(target.read_text(), 'revision two')


if __name__ == '__main__': unittest.main()
