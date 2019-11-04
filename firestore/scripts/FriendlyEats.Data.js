/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
const functions = firebase.functions();
// functions.useFunctionsEmulator('http://localhost:5001');

FriendlyEats.prototype.addRestaurant = function (data) {
  const collection = firebase.firestore().collection('restaurants');
  return collection.add(data);
};

FriendlyEats.prototype.getAllRestaurants = function (render) {
  const query = firebase.firestore()
    .collection('restaurants')
    .orderBy('avgRating', 'desc')
    .limit(50);
  this.getDocumentsInQuery(query, render);
};

FriendlyEats.prototype.getDocumentsInQuery = function (query, render) {
  query.onSnapshot((snapshot) => {
    if (!snapshot.size) {
      return render();
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        render(change.doc);
      }
    });
  });
};

FriendlyEats.prototype.getRestaurant = function (id) {
  return firebase.firestore().collection('restaurants').doc(id).get();
};

FriendlyEats.prototype.getFilteredRestaurants = function (filters, render) {
  let query = firebase.firestore().collection('restaurants');

  if (filters.category !== 'Any') {
    query = query.where('category', '==', filters.category);
  }

  if (filters.city !== 'Any') {
    query = query.where('city', '==', filters.city);
  }

  if (filters.price !== 'Any') {
    query = query.where('price', '==', filters.price.length);
  }

  if (filters.sort === 'Rating') {
    query = query.orderBy('avgRating', 'desc');
  } else if (filters.sort === 'Reviews') {
    query = query.orderBy('numRatings', 'desc');
  }

  this.getDocumentsInQuery(query, render);
};

FriendlyEats.prototype.getFavorites = function(render) {

  const getFavoritesFunction = functions.httpsCallable('getFavorites_v0');
  console.log('UserID is still ' + firebase.auth().currentUser.uid);
  getFavoritesFunction({uid: firebase.auth().currentUser.uid}).then(function(result) {
    const restaurantDocs = result.data;
    restaurantDocs.forEach((restaurantDoc) => {
      console.log('Next restaurant ' + restaurantDoc);
      render(restaurantDoc);
    });
    console.log(restaurantDocs);
  });

};


FriendlyEats.prototype.addToFavorites = function(restaurantID) {
  const currUserID = firebase.auth().currentUser.uid;
  const userDoc = firebase.firestore().collection('users').doc(currUserID);
  userDoc.update({
    favorites: firebase.firestore.FieldValue.arrayUnion(restaurantID)
  });
  
};

FriendlyEats.prototype.removeFromFavorites = function(restaurantID) {
  const currUserID = firebase.auth().currentUser.uid;
  const userDoc = firebase.firestore().collection('users').doc(currUserID);
  userDoc.update({
    favorites: firebase.firestore.FieldValue.arrayRemove(restaurantID)
  });
};


FriendlyEats.prototype.addRating = function (restaurantID, rating) {
  const collection = firebase.firestore().collection('restaurants');
  const restDocument = collection.doc(restaurantID);
  const newRatingDocument = restDocument.collection('ratings').doc();
  console.log('Add rating document ', newRatingDocument, ' at ', newRatingDocument.path);
  return newRatingDocument.set(rating).then(() => {
    restDocument.get().then((doc) => {
      console.log('Look what I have! ', doc);
      const data = doc.data();
      const newAverage = (data.numRatings * data.avgRating + rating.rating) /
        (data.numRatings + 1);
      const newConut = data.numRatings + 1;
      console.log('New average recorded of: ', newAverage);

      restDocument.update({
        numRatings: newConut,
        aveRating: newAverage
      }).then(() => {
        console.log('All done recording the new average');
      }).catch((error) => {
        console.error('Got an error!', error);
      });
    });
  }).catch((error) => {
    console.error('Got an error!', error);
  });


  /*  return firebase.firestore().runTransaction((transaction) => {
      return transaction.get(document).then((doc) => {
        const data = doc.data();
  
        const newAverage =
            (data.numRatings * data.avgRating + rating.rating) /
            (data.numRatings + 1);
  
        transaction.update(document, {
          numRatings: data.numRatings + 1,
          avgRating: newAverage
        });
        return transaction.set(newRatingDocument, rating);
      });
    });*/
};
