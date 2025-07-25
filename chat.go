package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	pusher "github.com/pusher/pusher-http-go"
)

var client = pusher.Client{}

func init() {
	client.AppId = os.Getenv("PUSHER_APP_ID")
	client.Key = os.Getenv("PUSHER_KEY")
	client.Secret = os.Getenv("PUSHER_SECRET")
	client.Cluster = os.Getenv("PUSHER_CLUSTER")
	client.Secure = true
}

type user struct {
	Name  string `json:"name" xml:"name" form:"name" query:"name"`
	Email string `json:"email" xml:"email" form:"email" query:"email"`
}

func registerNewUser(rw http.ResponseWriter, req *http.Request) {
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		panic(err)
	}

	var newUser user

	err = json.Unmarshal(body, &newUser)
	if err != nil {
		panic(err)
	}

	client.Trigger("update", "new-user", newUser)

	json.NewEncoder(rw).Encode(newUser)
}

func pusherAuth(res http.ResponseWriter, req *http.Request) {
	params, _ := ioutil.ReadAll(req.Body)
	response, err := client.AuthenticatePrivateChannel(params)
	if err != nil {
		panic(err)
	}

	fmt.Fprintf(res, string(response))
}

func serveConfigJS(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Content-Type", "application/javascript")
	fmt.Fprintf(rw, "window.PUSHER_KEY = \"%s\";\n", os.Getenv("PUSHER_KEY"))
	fmt.Fprintf(rw, "window.PUSHER_CLUSTER = \"%s\";\n", os.Getenv("PUSHER_CLUSTER"))
}

func main() {
	http.Handle("/", http.FileServer(http.Dir("./public")))

	http.HandleFunc("/new/user", registerNewUser)
	http.HandleFunc("/pusher/auth", pusherAuth)
	http.HandleFunc("/config.js", serveConfigJS)

	log.Fatal(http.ListenAndServe(":8090", nil))
}
