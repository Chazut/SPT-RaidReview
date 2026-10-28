"""Run the isolated regression executable in the installed game's Mono runtime.

Does not start SPT, load a profile, or write to the game installation.
Build first: dotnet build Tests/FikaMono -c Release -p:GamePath=C:/Games/SPT-4.1
Run: python Tests/FikaMono/run.py C:/Games/SPT-4.1
"""
import ctypes
import os
import sys
from pathlib import Path

game = Path(sys.argv[1]).resolve()
exe = Path(__file__).resolve().parent / 'bin' / 'Release' / 'FikaMono.exe'
runtime = game / 'MonoBleedingEdge' / 'EmbedRuntime'
dll_directory = os.add_dll_directory(str(runtime))
mono = ctypes.CDLL(str(runtime / 'mono-2.0-bdwgc.dll'))

def bind(name, result, *args):
    func = getattr(mono, name)
    func.restype, func.argtypes = result, args
    return func

bind('mono_set_assemblies_path', None, ctypes.c_char_p)(str(game / 'EscapeFromTarkov_Data' / 'Managed').encode())
bind('mono_set_config_dir', None, ctypes.c_char_p)(str(game / 'MonoBleedingEdge' / 'etc').encode())
domain = bind('mono_jit_init_version', ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p)(b'RaidReviewRegression', b'v4.0.30319')
if not domain:
    raise SystemExit('Cannot initialize isolated Mono runtime')
assembly = bind('mono_domain_assembly_open', ctypes.c_void_p, ctypes.c_void_p, ctypes.c_char_p)(domain, str(exe).encode())
if not assembly:
    raise SystemExit('Build Tests/FikaMono in Release first')
argv = (ctypes.c_char_p * 1)(str(exe).encode())
result = bind('mono_jit_exec', ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_char_p))(domain, assembly, 1, argv)
sys.stdout.flush()
sys.stderr.flush()
os._exit(result)
