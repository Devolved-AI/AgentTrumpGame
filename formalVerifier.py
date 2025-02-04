#!/usr/bin/env python3
import argparse
import sys
import json
import subprocess
import os
from pathlib import Path
from typing import Dict, Any, List
import solcx
from mythril.mythril import MythrilDisassembler
from mythril.analysis.symbolic import SymExecWrapper
from mythril.analysis.report import Report

class SolidityVerifier:
    def __init__(self, contract_path: str):
        self.contract_path = Path(contract_path).resolve()
        if not self.contract_path.exists():
            raise FileNotFoundError(f"Contract file not found: {contract_path}")
        
        # Install specific Solidity version
        solcx.install_solc('0.8.26')
        solcx.set_solc_version('0.8.26')
        
        # Set project root and lib directories
        self.project_root = self.find_project_root(self.contract_path)
        self.lib_path = os.path.join(self.project_root, 'lib')
        
        if not os.path.exists(self.lib_path):
            print("Installing Forge dependencies...")
            self.install_dependencies()

    def find_project_root(self, path: Path) -> str:
        """Find the root directory containing foundry.toml"""
        current = path.parent.absolute()
        while current != current.parent:
            if os.path.exists(os.path.join(current, 'foundry.toml')):
                return str(current)
            current = current.parent
        return str(path.parent.absolute())

    def install_dependencies(self):
        """Install Forge dependencies if needed"""
        try:
            print("Running forge install...")
            subprocess.run(['forge', 'install'], 
                         cwd=self.project_root, 
                         check=True,
                         stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            print(f"Failed to install dependencies: {e.stderr.decode()}")
            raise
        except FileNotFoundError:
            print("Error: Forge not found. Please install Foundry: https://book.getfoundry.sh/getting-started/installation")
            raise

    def find_file_in_lib(self, import_path: str) -> str:
        """Find a file in the lib directory based on import path"""
        # Handle OpenZeppelin imports
        if import_path.startswith('@openzeppelin/'):
            path_parts = import_path.split('/')
            # Check in lib/openzeppelin-contracts/contracts
            potential_path = os.path.join(
                self.lib_path,
                'openzeppelin-contracts',
                'contracts',
                *path_parts[2:]
            )
            if os.path.exists(potential_path):
                return potential_path
            
            # Also check in lib/openzeppelin/contracts
            potential_path = os.path.join(
                self.lib_path,
                'openzeppelin',
                'contracts',
                *path_parts[2:]
            )
            if os.path.exists(potential_path):
                return potential_path
        
        raise FileNotFoundError(f"Could not find dependency: {import_path}")

    def find_all_imports(self) -> Dict[str, str]:
        """Find all imported files and their contents"""
        sources = {}
        
        # Add main contract
        with open(self.contract_path) as f:
            main_content = f.read()
            sources[str(self.contract_path)] = {'content': main_content}
        
        # Extract import statements
        import_lines = [line.strip() for line in main_content.split('\n') 
                       if line.strip().startswith('import')]
        
        for import_line in import_lines:
            # Extract path from import statement
            import_path = import_line.split('"')[1]
            try:
                file_path = self.find_file_in_lib(import_path)
                with open(file_path) as f:
                    sources[import_path] = {'content': f.read()}
            except FileNotFoundError as e:
                print(f"Warning: Could not find import {import_path}")
                raise
            
        return sources

    def compile_contract(self) -> Dict[str, Any]:
        """Compile the Solidity contract."""
        try:
            # Get all source files
            sources = self.find_all_imports()
            
            # Configure compiler input
            input_json = {
                'language': 'Solidity',
                'sources': sources,
                'settings': {
                    'optimizer': {
                        'enabled': True,
                        'runs': 200
                    },
                    'outputSelection': {
                        '*': {
                            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
                        }
                    }
                }
            }
            
            # Set environment variables for paths
            os.environ['SOLC_ALLOW_PATHS'] = f"{self.project_root},{self.lib_path}"
            
            # Compile with all necessary paths
            compilation_result = solcx.compile_standard(
                input_json,
                base_path=self.project_root,
                allow_paths=[self.project_root, self.lib_path]
            )
            
            contract_id = self.contract_path.stem
            return compilation_result['contracts'][str(self.contract_path)][contract_id]
            
        except solcx.exceptions.SolcError as e:
            print(f"Compilation error: {str(e)}")
            raise
        except Exception as e:
            print(f"Error during compilation: {str(e)}")
            raise

    def verify(self, properties_file: str = None) -> bool:
        """Run formal verification on the smart contract."""
        try:
            # Compile the contract
            print("Compiling contract...")
            compiled = self.compile_contract()
            bytecode = compiled['evm']['deployedBytecode']['object']
            
            # Initialize Mythril
            print("Running security analysis...")
            disassembler = MythrilDisassembler(eth=None, solc_version='0.8.26')
            address = disassembler.load_from_bytecode(bytecode)
            
            # Perform symbolic execution
            sym = SymExecWrapper(disassembler, address, modules=[])
            issues = sym.execute()
            
            # Generate report
            report = Report()
            for issue in issues:
                report.append_issue(issue)
            
            # Check custom properties if provided
            if properties_file:
                with open(properties_file) as f:
                    properties = json.load(f)
                self.verify_custom_properties(sym, properties)
            
            # Print results
            if len(issues) == 0:
                print("\n✅ No security issues found")
                print("\nVerification successful!")
                return True
            else:
                print("\n❌ Security issues found:")
                print(report.as_text())
                return False
                
        except Exception as e:
            print(f"Verification failed: {str(e)}")
            raise

    def verify_custom_properties(self, sym: SymExecWrapper, properties: Dict[str, Any]):
        """Verify custom properties specified by the user."""
        for prop_name, prop_def in properties.items():
            print(f"\nVerifying property: {prop_name}")
            
            if prop_def['type'] == 'invariant':
                self.verify_invariant(sym, prop_def['condition'])
            elif prop_def['type'] == 'pre_post':
                self.verify_pre_post(sym, prop_def['pre'], prop_def['post'])
            else:
                print(f"Unknown property type: {prop_def['type']}")

    def verify_invariant(self, sym: SymExecWrapper, condition: str):
        """Verify an invariant property."""
        # Implementation for invariant checking
        pass

    def verify_pre_post(self, sym: SymExecWrapper, pre: str, post: str):
        """Verify a pre/post condition property."""
        # Implementation for pre/post condition checking
        pass

def main():
    parser = argparse.ArgumentParser(description='Solidity Smart Contract Formal Verifier')
    parser.add_argument('contract_file', help='Solidity contract file to verify')
    parser.add_argument('--properties', help='JSON file containing custom properties to verify')
    args = parser.parse_args()

    verifier = SolidityVerifier(args.contract_file)
    success = verifier.verify(args.properties)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
