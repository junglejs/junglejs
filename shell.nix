let pkgs = import <nixpkgs> {};

in pkgs.mkShell rec {
  name = "dev";

  buildInputs = with pkgs; [
    nodejs-14_x
    nodePackages_latest.node-gyp
    nodePackages_latest.typescript
  ];
}
