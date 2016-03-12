


module.exports = {
    contains : function(elemToSearch, array) {
        var i = array.length;
        while (i--) {
            if (array[i] === elemToSearch) {
                return true;
            }
        }
        return false;
    }
};