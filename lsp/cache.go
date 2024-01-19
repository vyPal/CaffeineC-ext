package main

import (
	"encoding/gob"
	"fmt"
	"log"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"gopkg.in/yaml.v2"
)

type CfConf struct {
	Name         string             `yaml:"name"`
	Description  string             `yaml:"description"`
	Version      string             `yaml:"version"`
	Main         string             `yaml:"main"`
	SourceDir    string             `yaml:"source"`
	Dependencies []CFConfDependency `yaml:"dependencies"`
	Author       string             `yaml:"author"`
	License      string             `yaml:"license"`
}

type CFConfDependency struct {
	Package    string `yaml:"package"`
	Version    string `yaml:"version"`
	Identifier string `yaml:"identifier"`
}

type PackageCache struct {
	BaseDir string
	RootDir string
	PkgList []Package
}

type Package struct {
	Name       string
	Version    string
	Identifier string
	Path       string
}

func (p *PackageCache) Init() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatal(err)
	}

	libDir := path.Join(homeDir, ".local", "lib", "CaffeineC")
	if runtime.GOOS == "windows" {
		libDir = path.Join(homeDir, "AppData", "Local", "Programs", "CaffeineC")
	}

	err = os.MkdirAll(libDir, 0700)
	if err != nil {
		return err
	}

	cacheDir := path.Join(libDir, "packages")
	err = os.Mkdir(cacheDir, 0700)
	if err != nil && !os.IsExist(err) {
		return err
	}

	p.RootDir = libDir
	p.BaseDir = cacheDir
	p.PkgList = make([]Package, 0)

	return nil
}

func (p *PackageCache) DeepCacheScan() error {
	err := filepath.WalkDir(p.BaseDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		if d.IsDir() {
			conf, err := GetCfConf(path)
			if err != nil {
				if os.IsNotExist(err) {
					return nil
				} else {
					return err
				}
			}

			identifier := strings.TrimPrefix(path, p.BaseDir)
			identifier = strings.TrimPrefix(identifier, "/")
			split := strings.Split(identifier, "/")
			branch := split[len(split)-1]
			identifier = strings.TrimSuffix(identifier, "/"+branch)

			pkg := Package{
				Name:       conf.Name,
				Version:    branch,
				Identifier: identifier,
				Path:       path,
			}

			p.PkgList = append(p.PkgList, pkg)
			return filepath.SkipDir
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}

func (p *PackageCache) CacheScan(deepOnFail bool) error {
	cacheFile, err := os.Open(path.Join(p.BaseDir, "cache.bin"))
	if err != nil {
		if os.IsNotExist(err) {
			if deepOnFail {
				fmt.Println("Cache file not found, performing deep scan...")
				err := p.DeepCacheScan()
				if err != nil {
					return err
				}

				err = p.CacheSave()
				if err != nil {
					return err
				}
				return nil
			} else {
				return err
			}
		} else {
			return err
		}
	}

	decoder := gob.NewDecoder(cacheFile)
	err = decoder.Decode(&p.PkgList)
	if err != nil {
		return err
	}

	return nil
}

func (p *PackageCache) CacheSave() error {
	cacheFile, err := os.Create(path.Join(p.BaseDir, "cache.bin"))
	if err != nil {
		return err
	}

	encoder := gob.NewEncoder(cacheFile)
	err = encoder.Encode(p.PkgList)
	if err != nil {
		return err
	}

	return nil
}

func (p *PackageCache) GetPackage(name, version, identifier string) (Package, error) {
	for _, pkg := range p.PkgList {
		if (pkg.Name == name || name == "") && (pkg.Identifier == identifier || pkg.Identifier == "github.com/"+identifier) {
			if version == "" || version == "*" || version == pkg.Version {
				return pkg, nil
			}
			continue
		}
	}

	return Package{}, nil
}

func (p *PackageCache) HasPackage(name, version, identifier string) (bool, error) {
	for _, pkg := range p.PkgList {
		if (pkg.Name == name || name == "") && (pkg.Identifier == identifier || pkg.Identifier == "github.com/"+identifier) {
			if version == "" || version == "*" || version == pkg.Version {
				return true, nil
			}
			continue
		}
	}

	return false, nil
}

func (p *PackageCache) ResolvePackage(ident string) (found bool, pkg Package, fp string, err error) {
	split := strings.Split(ident, "/")
	for i := len(split); i > 0; i-- {
		joined := strings.Join(split[:i], "/")
		found, err = p.HasPackage("", "*", joined)
		if err != nil {
			return false, Package{}, "", err
		}
		if found {
			fp = strings.Join(split[i:], "/")
			pkg, err = p.GetPackage("", "*", joined)
			if err != nil {
				return false, Package{}, "", err
			}
			break
		}
	}
	return found, pkg, fp, nil
}

func PrepUrl(liburl string) (u, ver string, e error) {
	version := "main"
	if strings.Contains(liburl, "@") {
		split := strings.Split(liburl, "@")
		liburl = split[0]
		version = split[1]
	}

	parsedUrl, err := url.Parse(liburl)
	if err != nil {
		return "", "", err
	}

	if parsedUrl.Hostname() == "" {
		liburl = "https://github.com/" + liburl
	}

	if !strings.HasPrefix(liburl, "http://") && !strings.HasPrefix(liburl, "https://") {
		liburl = "https://" + liburl
	}
	return liburl, version, nil
}

func UpdateLibrary(pcache PackageCache, liburl string) (conf CfConf, ident, ver string, e error) {
	liburl, version, err := PrepUrl(liburl)
	if err != nil {
		return CfConf{}, "", "", err
	}

	// Get the directory in the cache's BaseDir
	updateDir := filepath.Join(pcache.BaseDir, strings.TrimPrefix(liburl, "https://"), version)

	// Open the existing repository
	repo, err := git.PlainOpen(updateDir)
	if err != nil {
		return CfConf{}, "", "", err
	}

	// Get the working directory for the repository
	w, err := repo.Worktree()
	if err != nil {
		return CfConf{}, "", "", err
	}

	// Pull the latest changes from the origin
	err = w.Pull(&git.PullOptions{
		RemoteName:    "origin",
		ReferenceName: plumbing.NewBranchReferenceName(version),
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return CfConf{}, "", "", err
	}

	// Get the configuration file from the updated repository
	conf, err = GetCfConf(updateDir)
	if err != nil {
		return CfConf{}, "", "", err
	}

	return conf, strings.TrimPrefix(liburl, "https://"), version, nil
}

func ResolveImportPath(path string, pcache PackageCache) (string, error) {
	if strings.HasPrefix(path, "./") || strings.HasPrefix(path, "/") || strings.HasPrefix(path, "../") {
		return path, nil
	} else {
		found, pkg, fp, err := pcache.ResolvePackage(path)
		if err != nil {
			return "", err
		}
		if found {
			conf, err := GetCfConf(pkg.Path)
			if err != nil {
				return "", err
			}
			if conf.SourceDir == "" {
				conf.SourceDir = "src"
			}
			if !strings.HasSuffix(fp, ".cffc") {
				fp += ".cffc"
			}
			return filepath.Join(pkg.Path, conf.SourceDir, fp), nil
		} else {
			return fmt.Sprintf("./%s", path), nil
		}
	}
}

func GetCfConf(dir string) (CfConf, error) {
	var conf CfConf

	file, err := os.Open(path.Join(dir, "cfconf.yaml"))
	if err != nil {
		return CfConf{}, err
	}

	decoder := yaml.NewDecoder(file)
	err = decoder.Decode(&conf)
	if err != nil {
		return CfConf{}, err
	}

	return conf, nil
}
